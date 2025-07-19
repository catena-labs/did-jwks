/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
const config = {
  trailingComma: "none",
  tabWidth: 2,
  semi: false,
  singleQuote: false,
  plugins: ["prettier-plugin-packagejson"]
}

export default config
