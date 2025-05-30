# Encryptify

A simple and secure command-line tool for creating and sharing encrypted messages using GPG.

## Description

Encryptify is a command-line utility that helps you create and share encrypted messages using GPG (GNU Privacy Guard). It provides an interactive way to select recipients from your GPG keyring and creates encrypted messages that can be easily shared.

## Features

- Interactive recipient selection using fzf
- Automatic GPG key management
- Secure message creation with editor
- Automatic clipboard copying of decryption command
- Support for multiple recipients
- ASCII-armored output for easy sharing

## Prerequisites

- GPG (GNU Privacy Guard)
- fzf (Fuzzy Finder)
- zx (Node.js tool for writing better shell scripts)

## Installation

Install using Homebrew:

```bash
brew tap andenkondor/zapfhahn
brew install andenkondor/zapfhahn/encryptify
```

## Usage

Run the script:

```bash
enc --creator my.email@address.com
```

The script will:

1. Show you a list of available GPG keys
2. Let you select recipients using fzf
3. Open Neovide editor for you to write your message
4. Encrypt the message for all selected recipients
5. Copy the decryption command to your clipboard
6. Display the decryption command in the terminal

## How it Works

1. The script reads your GPG keyring to get available recipients
2. You can select multiple recipients using fzf
3. A temporary file is created with a default template
4. Neovide opens for you to edit the message
5. The message is encrypted using GPG with the selected recipients
6. The decryption command is copied to your clipboard for easy sharing

## Editor

By default encryptify opens the secret file with [Neovide](https://neovide.dev).
But you can use any editor with arbitrary parameters:

```bash
# IntelliJ
enc --creator --editor "idea --wait"

# Visual Studio Code
enc --creator --editor "code --wait"
```

## Security

- Messages are encrypted using GPG's strong encryption
- Temporary files are automatically cleaned up
- No sensitive data is stored on disk
- Uses ASCII-armored output for safe transmission

## License

This project is open source and available under the MIT License.

## Author

Created by [andenkondor](https://github.com/andenkondor)
