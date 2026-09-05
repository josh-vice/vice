#!/usr/bin/env bun
const productionUrl = process.env.VICE_PRODUCTION_URL?.trim();
const inviteCode = process.env.VICE_BETA_TEST_CODE ?? '';
if (!productionUrl || !inviteCode) throw new Error('VICE_PRODUCTION_URL and VICE_BETA_TEST_CODE are required');

function originPath(path) { return new URL(path, productionUrl); }
async function postLogin(code) {
	return fetch(originPath('/api/beta/login'), {
		method: 'POST',
		redirect: 'manual',
		headers: { accept: 'application/json', 'content-type': 'application/json' },
		body: JSON.stringify({ code })
	});
}
function cookieValue(response) {
	const raw = response.headers.get('set-cookie') ?? '';
	const value = raw.split(';', 1)[0];
	if (!value || !value.startsWith('vice_beta_session=')) throw new Error('successful beta login did not set the expected session cookie');
	return { cookie: value, httpOnly: /;\s*HttpOnly/i.test(raw), secure: /;\s*Secure/i.test(raw), sameSite: /SameSite=(Strict|Lax|None)/i.exec(raw)?.[1]?.toLowerCase() ?? null };
}

const page = await fetch(originPath('/trade'), { redirect: 'manual', headers: { accept: 'text/html' } });
if (page.status !== 303 || !page.headers.get('location')?.startsWith('/login')) throw new Error(`unauthenticated /trade expected 303 /login, received ${page.status}`);

const invalid = await postLogin('invalid-code-for-smoke');
if (invalid.status !== 401) throw new Error(`invalid beta code expected 401, received ${invalid.status}`);

const valid = await postLogin(inviteCode);
if (valid.status !== 200) throw new Error(`valid beta code expected 200, received ${valid.status}`);
const session = cookieValue(valid);
if (!session.httpOnly || !session.secure || !['strict', 'lax'].includes(session.sameSite ?? '')) throw new Error('beta session cookie lacks required security attributes');

const authedPage = await fetch(originPath('/trade'), { redirect: 'manual', headers: { accept: 'text/html', cookie: session.cookie } });
if (authedPage.status !== 200) throw new Error(`authenticated /trade expected 200, received ${authedPage.status}`);
const protectedApi = await fetch(originPath('/api/hl/book?coin=BTC'), { headers: { accept: 'application/json', cookie: session.cookie } });
if (protectedApi.status === 401) throw new Error('authenticated protected API remained unauthorized');

const logout = await fetch(originPath('/api/beta/logout'), { method: 'POST', redirect: 'manual', headers: { accept: 'application/json', cookie: session.cookie } });
if (![200, 204].includes(logout.status)) throw new Error(`beta logout expected 200/204, received ${logout.status}`);
const afterLogout = await fetch(originPath('/api/hl/book?coin=BTC'), { headers: { accept: 'application/json', cookie: session.cookie } });
if (afterLogout.status !== 401) throw new Error(`revoked browser session expected 401, received ${afterLogout.status}`);

console.log(JSON.stringify({ ok: true, unauthenticatedRedirect: page.status, invalidCode: invalid.status, validCode: valid.status, authenticatedPage: authedPage.status, protectedApi: protectedApi.status, logout: logout.status, postLogoutProtectedApi: afterLogout.status, cookie: { httpOnly: session.httpOnly, secure: session.secure, sameSite: session.sameSite }, checkedAt: new Date().toISOString() }));
