# Tavern-Helper

> [!Warning]
> Executing custom JavaScript code can bring security risks:
>
> - Malicious scripts may steal your sensitive information such as API keys, chat records, etc.; modify or damage your SillyTavern settings
> - Some scripts may perform dangerous operations, such as sending unauthorized requests
>
> Please do the following before executing any script:
>
> 1. Carefully check the script content to ensure its source is trustworthy
> 2. Understand the function and possible impact of the script
> 3. If in doubt, do not execute scripts from unknown sources
>
> We are not responsible for any losses caused by third-party scripts.

This extension allows you to run external JavaScript code in SillyTavern.

Since SillyTavern does not support direct execution of JavaScript code by default, this extension allows you to run external scripts in certain restricted contexts by using iframes to isolate and execute scripts.

## Documentation

- [Documentation](https://n0vi028.github.io/JS-Slash-Runner-Doc/)

## Contribution Tips

### Project Structure

Based on the project structure requirements of the Tavern UI plugin, this project directly packages the source code in the `dist/` folder and uploads it with the repository, which will often cause branch conflicts during development.

To solve this, the repository sets the conflict in the `dist/` folder to always use the current version in `.gitattribute`. This will not be a problem: after uploading, the ci will repackage the `dist/` folder into the latest version, so it doesn't matter what the content of the `dist/` folder you upload is.

To enable this function, please execute the following command once:

```bash
git config --global merge.ours.driver true
```

### Manual Compilation

You can refer to [VSCode Environment Configuration for Front-end Plug-in Development](https://sillytavern-stage-girls-dog.readthedocs.io/tool_and_experience/js_slash_runner/index.html) for more detailed configuration and usage tutorials on VSCode.

You need to have node 22+ and pnpm installed first. If you have already installed node 22+, you can install pnpm as follows:

```bash
npm install -g pnpm
```

Then, use pnpm to install all the dependencies of this project:

```bash
pnpm install
```

Then you can compile this project:

```bash
pnpm build
```

Alternatively, you can use `pnpm watch` to continuously monitor code changes. In this way, you only need to refresh the tavern page, and the tavern will use the latest plug-in code.

## License

- [Aladdin](LICENSE)

## Reference

[【SillyTavern / ST Tavern】html code injector](https://greasyfork.org/zh-CN/scripts/503174-sillytavern-st%E9%85%92%E9%A6%86-html%E4%BB%A3%E7%A0%81%E6%B3%A8%E5%85%A5%E5%99%A8)

[Dynamic Audio](httpshttps://github.com/SillyTavern/Extension-Audio)
