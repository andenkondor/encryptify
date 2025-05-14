#!/usr/bin/env zx

const getRecipientParams = (recipients) =>
  recipients.filter((r) => Boolean(r)).flatMap((r) => ["--recipient", r]);

const getDefaultContent = (creator, recipients) =>
  `This message was created with https://github.com/andenkondor/encryptify
Timestamp of creation: ${new Date().toISOString()}
${creator ? "Creator: " + creator : ""}
Recipient(s): ${recipients.join("; ")}

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

const secretFile = await tmpfile();

try {
  await $`echo ${getDefaultContent(creator, chosenRecipients)} >> ${secretFile}`;
  await $`neovide ${secretFile}`;
  const encryptCmd = [
    "gpg",
    "--encrypt",
    "--armor",
    "--trust-model",
    "always",
    ...getRecipientParams([...chosenRecipients, creator]),
    secretFile,
  ];

  await $`${encryptCmd}`;
  const encrypted = fs.readFileSync(`${secretFile}.asc`);
  const decryptCommand = `gpg --decrypt --quiet <<EOF
${encrypted}
EOF`;

  await $({ input: decryptCommand })`pbcopy`;
  echo(decryptCommand);
} finally {
  $`rm ${secretFile} ${secretFile}.asc`;
}
