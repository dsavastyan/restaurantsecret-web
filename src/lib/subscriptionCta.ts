export const SUBSCRIPTION_CHECKOUT_PATH = "/account/subscription";

const normalizeSourcePath = (sourcePath?: string) => {
  if (!sourcePath || !sourcePath.startsWith("/") || sourcePath.startsWith("//")) return undefined;
  return sourcePath;
};

export function getSubscriptionCheckoutLink(accessToken?: string | null, sourcePath?: string) {
  const returnTo = normalizeSourcePath(sourcePath);

  if (accessToken) {
    return {
      to: SUBSCRIPTION_CHECKOUT_PATH,
      state: returnTo ? { from: returnTo } : undefined,
    };
  }

  return {
    to: "/login",
    state: returnTo
      ? { from: SUBSCRIPTION_CHECKOUT_PATH, returnTo }
      : { from: SUBSCRIPTION_CHECKOUT_PATH },
  };
}
