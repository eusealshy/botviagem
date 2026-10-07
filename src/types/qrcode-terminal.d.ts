declare module "qrcode-terminal" {
  function generate(
    text: string,
    options?: { small?: boolean },
    cb?: () => void,
  ): void;
  export default { generate };
}
