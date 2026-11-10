ARG PYTHON_VERSION=3.12
FROM node:22-bookworm-slim AS node
FROM python:${PYTHON_VERSION}-slim-bookworm
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN --mount=type=secret,id=proxy_ca,required=true \
    apt-get -o Acquire::https::CaInfo=/run/secrets/proxy_ca update \
    && apt-get -o Acquire::https::CaInfo=/run/secrets/proxy_ca install -y --no-install-recommends git curl ca-certificates libstdc++6 \
    && PIP_CERT=/run/secrets/proxy_ca pip install --no-cache-dir PyYAML==6.0.3 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && useradd --create-home --uid 1000 runner
USER runner
WORKDIR /work
