export async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  return response;
} 