import { defineConfig } from "vite";

// GitHub Pages はリポジトリ名のサブパスで配信されるため、相対パスでビルドする
export default defineConfig({
  base: "./",
});
