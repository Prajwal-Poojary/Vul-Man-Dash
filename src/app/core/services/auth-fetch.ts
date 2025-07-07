export async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  let headers = (init && init.headers) ? new Headers(init.headers) : new Headers();
  if (!headers.has('Authorization')) {
    const user = localStorage.getItem('currentUser');
    if (user) {
      const token = JSON.parse(user).token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
  }
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  return response;
} 