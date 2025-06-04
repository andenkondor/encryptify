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

function getRecipientParams(...recipients) {
  return recipients
    .filter((r) => Boolean(r))
    .flatMap((r) => ["--hidden-recipient", r]);
}

function getDefaultContent(author, recipients) {
  return `This message was created with https://github.com/andenkondor/encryptify
Timestamp of creation: ${new Date().toISOString()}
${author ? "author: " + author : ""}
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
  })`fzf --height 40% --border --multi`.lines();
}

async function getSecretFiles(defaultContent) {
  const secretFilePath = await tmpfile(undefined, defaultContent);
  const encryptedSecretFilePath = secretFilePath + ".asc";

  const cleanUpCallback = () =>
    $`rm ${secretFilePath} ${encryptedSecretFilePath}`;

  return [secretFilePath, encryptedSecretFilePath, cleanUpCallback];
}

async function captureUserInput(secretFilePath, editor) {
  const getLastModified = async () =>
    (await $.sync`stat -f %m ${secretFilePath}`).text();

  const lastModifiedBaseline = await getLastModified();
  await $`${[...(editor ?? "neovide").split(" "), secretFilePath]}`;

  if (lastModifiedBaseline === (await getLastModified())) {
    echo(chalk.red("file hasn't changed."));
    process.exit(1);
  }
}

async function produceOutput(encryptedSecretFilePath, recipients) {
  const encryptedContent = fs.readFileSync(encryptedSecretFilePath);
  const decryptCmd = `gpg --decrypt --quiet <<EOF | vim -
${encryptedContent}
EOF`;

  await $({ input: decryptCmd })`pbcopy`;

  echo(chalk.green(`Message encrypted for: ${recipients.join(", ")}`));
  echo(decryptCmd);
}

async function main() {
  const { editor } = argv;

  const author = await getDefaultKey();
  const recipients = await getRecipients(author);
  const [secretFilePath, encryptedSecretFilePath, cleanUpFiles] =
    await getSecretFiles(getDefaultContent(author, recipients));

  try {
    await captureUserInput(secretFilePath, editor);

    await $`${[
      "gpg",
      "--encrypt",
      "--sign",
      "--armor",
      ...["--trust-model", "always"],
      ...getRecipientParams(author),
      ...getRecipientParams(recipients),
      secretFilePath,
    ]}`;

    await produceOutput(encryptedSecretFilePath, recipients);
  } finally {
    await cleanUpFiles();
  }
}

await main();
