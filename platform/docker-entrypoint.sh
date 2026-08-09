#!/bin/sh
# A Railway monta o Volume persistente em /app/storage DEPOIS de o container
# arrancar, sobrepondo-se ao diretorio que foi criado e chown-ado em build
# time (ver Dockerfile). Um volume novo/existente e montado como root:root,
# por isso o utilizador nextjs (nao-root, ver USER no Dockerfile) fica sem
# permissao para criar a subpasta uploads la dentro -> EACCES no mkdir
# feito por src/lib/storage.ts em cada upload.
#
# Este entrypoint corre como root (o Dockerfile ja nao troca de utilizador
# antes do CMD), garante as permissoes corretas no volume montado em CADA
# arranque do container, e so depois entrega a execucao ao utilizador
# nextjs via su-exec -- o processo Node.js final nunca corre como root.
set -e

mkdir -p /app/storage/uploads
chown -R nextjs:nodejs /app/storage

exec su-exec nextjs "$@"
