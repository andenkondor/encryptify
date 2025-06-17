#!/usr/bin/env zx

$.quiet = true;

async function getDefaultKey() {
  const signOutput = (
    await $`echo "lololol" | gpg --sign --verbose --armor`
  ).lines();

  const signMetadata = signOutput.slice(
    0,
    signOutput.findIndex((line) => line === "-----BEGIN PGP MESSAGE-----"),
  );

  return signMetadata.at(-1).match(/<([^>]+)>/)[1];
}

function getDefaultContent(author, recipients) {
  return `This message was created with https://github.com/andenkondor/encryptify
Timestamp of creation: ${new Date().toISOString()}
Author: ${author}
Message was created for ${recipients.length} recipient(s)
-----------------------------------------------------------------------
// Add your secret stuff here
// mySuperSecretPassword123`;
}

async function getRecipients(author) {
  const allMailAddresses = await $`gpg --list-keys --with-colons`
    .pipe($`grep '^uid:'`)
    .pipe($`awk -F':' '{print $(9+1)}'`)
    .pipe(
      $`awk 'match($0, /<[^>]*>/) { print substr($0, RSTART+1, RLENGTH-2) }'`,
    )
    .pipe($`grep -v ${author}`);

  return $({
    input: allMailAddresses,
  })`${[
    "fzf",
    "--border",
    "--exact",
    "--multi",
    "--reverse",
    "--height=~100%",
    "--prompt=select recipient(s): ",
    "--color=fg:#d0d0d0,fg+:#d0d0d0,bg:#121212,bg+:#262626",
    "--color=hl:#5f87af,hl+:#5fd7ff,info:#afaf87,marker:#87ff00",
    "--color=prompt:#d7005f,spinner:#af5fff,pointer:#af5fff,header:#87afaf",
  ]}
`.lines();
}

async function getSecretFiles(defaultContent) {
  const secretFilePath = await tmpfile(undefined, defaultContent);
  const encryptedSecretFilePath = secretFilePath + ".asc";

  const cleanUpCallback = () =>
    $`rm ${secretFilePath} ${encryptedSecretFilePath}`;

  return [secretFilePath, encryptedSecretFilePath, cleanUpCallback];
}

async function captureUserInput(secretFilePath) {
  const getLastModified = async () =>
    (await $`stat -f %m ${secretFilePath}`).text();

  const lastModifiedBaseline = await getLastModified();

  const [editor, ...editorArgs] = process.env.EDITOR.split(" ");
  $.spawnSync(editor, [...editorArgs, secretFilePath], {
    stdio: "inherit",
  });

  if (lastModifiedBaseline === (await getLastModified())) {
    echo(chalk.red("file hasn't changed."));
    process.exit(1);
  }
}

async function produceOutput(encryptedSecretFilePath, recipients) {
  const encryptedContent = fs.readFileSync(encryptedSecretFilePath);
  const decryptCmd = `gpg --decrypt --quiet <<EOF | vim -m -M -
${encryptedContent}
EOF`;

  await $({ input: decryptCmd })`pbcopy`;

  echo(chalk.green(`Message encrypted for: ${recipients.join(", ")}`));
  echo(decryptCmd);
}

async function main() {
  const author = await getDefaultKey();
  const recipients = await getRecipients(author);
  const [secretFilePath, encryptedSecretFilePath, cleanUpFiles] =
    await getSecretFiles(getDefaultContent(author, recipients));

  try {
    await captureUserInput(secretFilePath);

    await $`${[
      "gpg",
      "--encrypt",
      "--sign",
      "--armor",
      ...["--trust-model", "always"],
      ...[author, ...recipients].flatMap((r) => ["--hidden-recipient", r]),
      secretFilePath,
    ]}`;

    await produceOutput(encryptedSecretFilePath, recipients);
  } finally {
    await cleanUpFiles();
  }
}

await main();
