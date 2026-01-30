import esbuild from "esbuild";

const args = process.argv.slice(2);
const isWatch = args.includes("--watch");
const serveDirArg = args.find((arg) => arg.startsWith("--servedir="));
const serveDir = serveDirArg ? serveDirArg.split("=")[1] : null;

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  sourcemap: true,
  format: "esm",
  outdir: "public/dist",
  platform: "browser",
  target: ["es2020"]
});

await ctx.rebuild();

if (isWatch) {
  await ctx.watch();
  if (serveDir) {
    const { host, port } = await ctx.serve({
      servedir: serveDir,
      port: 5173,
      host: "0.0.0.0"
    });
    console.log(`dev server: http://${host}:${port}`);
  }
} else {
  await ctx.dispose();
}
