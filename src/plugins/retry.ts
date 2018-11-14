// source: https://gitlab.com/snippets/1775781 Daniel Iñigo <danielinigobanos@gmail.com>
export default async function retry(
  fn,
  retriesLeft = 5,
  interval = 1000,
  exponential = false
) {
  try {
    const val = await fn();
    return val;
  } catch (error) {
    if (retriesLeft) {
      // tslint:disable-next-line no-string-based-set-timeout
      await new Promise(r => setTimeout(r, interval));
      return retry(
        fn,
        retriesLeft - 1,
        exponential ? interval * 2 : interval,
        exponential
      );
    } else throw error;
  }
}
