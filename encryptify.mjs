#!/usr/bin/env zx

const getRecipientParams = (recipients) =>
  recipients.filter((r) => Boolean(r)).flatMap((r) => ["--recipient", r]);

const getDefaultContent = (creator, recipients) =>
  `This message was created with https://github.com/andenkondor/encryptify
Timestamp of creation: ${new Date().toISOString()}
${creator ? "Creator: " + creator : ""}
Recipient(s): ${recipients.join("; ")}
-----------------------------------------------------------------------
// Add your secret stuff here
// mySuperSecretPassword`;

const { creator } = argv;
const allMailAddresses = await $`gpg --list-keys`
  .pipe($`grep uid`)
  .pipe($`awk '{print $NF}'`)
  .pipe($`sed 's/[<>]//g'`)
  .pipe($`grep -v ${creator}`);

const chosenRecipients = await $({
  input: allMailAddresses,
})`fzf --height 40% --border --multi`.lines();

const secretFilePath = await tmpfile();
const encryptedSecretFilePath = secretFilePath + ".asc";

try {
  await $`echo ${getDefaultContent(creator, chosenRecipients)} >> ${secretFilePath}`;
  await $`neovide ${secretFilePath}`;
  const encryptCmd = [
    "gpg",
    "--encrypt",
    "--armor",
    "--trust-model",
    "always",
    ...getRecipientParams([...chosenRecipients, creator]),
    secretFilePath,
  ];

  await $`${encryptCmd}`;

  const encryptedContent = fs.readFileSync(encryptedSecretFilePath);
  const decryptCmd = `gpg --decrypt --quiet <<EOF
${encryptedContent}
EOF`;

  await $({ input: decryptCmd })`pbcopy`;
  echo(decryptCmd);
} finally {
  $`rm ${secretFilePath} ${encryptedSecretFilePath}`;
}
