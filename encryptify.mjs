#!/usr/bin/env zx

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
// mySuperSecretPassword`;

const { creator, editor } = argv;
const allMailAddresses = await $`gpg --list-keys`
  .pipe($`grep uid`)
  .pipe($`awk '{print $NF}'`)
  .pipe($`sed 's/[<>]//g'`)
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
