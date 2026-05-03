export const SUBSCRIPTION_CHECKOUT_PATH = "/account/subscription";

export function getSubscriptionCheckoutLink(accessToken?: string | null, sourcePath?: string) {
  if (accessToken) {
    return {
      to: SUBSCRIPTION_CHECKOUT_PATH,
      state: sourcePath ? { from: sourcePath } : undefined,
    };
  }

  return {
    to: "/login",
    state: { from: SUBSCRIPTION_CHECKOUT_PATH },
  };
}
