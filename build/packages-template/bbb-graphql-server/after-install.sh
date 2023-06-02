#!/bin/bash -e

case "$1" in
  configure|upgrade|1|2)

  fc-cache -f

  sudo -u postgres psql -c "alter user postgres password 'bbb_graphql'"
  sudo -u postgres psql -c "drop database if exists bbb_graphql"
  sudo -u postgres psql -c "create database bbb_graphql"
  sudo -u postgres psql -U postgres -d bbb_graphql -a -f /etc/default/bbb-graphql-server/bbb_schema.sql --set ON_ERROR_STOP=on
  sudo -u postgres psql -c "drop database if exists hasura_app"

  sudo -u postgres psql -c "create database hasura_app"
  echo "Postgresql configured"

  # Apply BBB metadata in Hasura
  cd /etc/default/bbb-graphql-server
  /usr/local/bin/hasura/hasura metadata apply
  cd ..
  rm -rf /etc/default/bbb-graphql-server/metadata

  systemctl enable bbb-graphql-server.service
  systemctl daemon-reload
  startService bbb-graphql-server || echo "bbb-graphql-server service could not be registered or started"
  ;;

  abort-upgrade|abort-remove|abort-deconfigure)
  ;;

  *)
    echo "postinst called with unknown argument \`$1'" >&2
    exit 1
  ;;
esac
