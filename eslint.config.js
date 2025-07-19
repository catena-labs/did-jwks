// @ts-check

import js from "@eslint/js"
import prettier from "eslint-config-prettier/flat"
import tseslint from "typescript-eslint"
import gitignore from "eslint-config-flat-gitignore"

export default tseslint.config(
  gitignore(),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/restrict-template-expressions": "off"
    }
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off"
    }
  },
  prettier
)
