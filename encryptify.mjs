#!/usr/bin/env zx

$.quiet = true;
const getDefaultKey = async () => {
  const signOutput = (
    await $`echo "lololol" | gpg --sign --verbose --armor`
  ).lines();

  const signMetadata = signOutput.slice(
    0,
    signOutput.findIndex((line) => line === "-----BEGIN PGP MESSAGE-----"),
  );

  return signMetadata.at(-1).match(/<([^>]+)>/)[1];
};

const getRecipientParams = (recipients) => {
  // If there are multiple recipients they should not know about each other
  // > 2 because the creator is also added as a recipient
  const recipientFlag =
    recipients.length > 2 ? "--hidden-recipient" : "--recipient";
  return recipients
    .filter((r) => Boolean(r))
    .flatMap((r) => [recipientFlag, r]);
};
const getDefaultContent = (creator, recipients) =>
  `This message was created with https://github.com/andenkondor/encryptify
Timestamp of creation: ${new Date().toISOString()}
${creator ? "Creator: " + creator : ""}
Message was created for ${recipients.length} recipient(s)
-----------------------------------------------------------------------
// Add your secret stuff here
// mySuperSecretPassword123`;

const { editor } = argv;

const creator = await getDefaultKey();
const allMailAddresses = await $`gpg --list-keys --with-colons`
  .pipe($`grep '^uid:'`)
  .pipe($`awk -F':' '{print $(9+1)}'`)
  .pipe($`awk 'match($0, /<[^>]*>/) { print substr($0, RSTART+1, RLENGTH-2) }'`)
  .pipe($`grep -v ${creator}`);

const chosenRecipients = await $({
  input: allMailAddresses,
})`fzf --height 40% --border --multi`.lines();

const secretFilePath = await tmpfile(
  undefined,
  getDefaultContent(creator, chosenRecipients),
);
const encryptedSecretFilePath = secretFilePath + ".asc";

try {
  await $`${[...(editor ?? "neovide").split(" "), secretFilePath]}`;
  const encryptCmd = [
    "gpg",
    "--encrypt",
    "--sign",
    "--armor",
    ...["--trust-model", "always"],
    ...getRecipientParams([...chosenRecipients, creator]),
    secretFilePath,
  ];

  await $`${encryptCmd}`;

  const encryptedContent = fs.readFileSync(encryptedSecretFilePath);
  const decryptCmd = `gpg --decrypt --quiet <<EOF
${encryptedContent}
EOF`;

  echo(chalk.green(`Message encrypted for: ${chosenRecipients.join(", ")}`));
  await $({ input: decryptCmd })`pbcopy`;
  echo(decryptCmd);
} finally {
  $`rm ${secretFilePath} ${encryptedSecretFilePath}`;
}
