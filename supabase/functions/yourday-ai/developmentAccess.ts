/** A client flag alone never grants developer quota; the server secret must match. */
export function hasDevelopmentAccess(request: Request, expectedToken: string | undefined): boolean {
  if (!expectedToken || expectedToken.length < 32) return false;
  const provided = request.headers.get('x-yourday-dev-token');
  if (!provided || provided.length !== expectedToken.length) return false;
  let difference = 0;
  for (let index = 0; index < expectedToken.length; index += 1) {
    difference |= provided.charCodeAt(index) ^ expectedToken.charCodeAt(index);
  }
  return difference === 0;
}
