FROM alpine/curl:latest

# Install necessary tools: bash, git and the official Docker CLI package.
RUN apk update && \
  apk add --no-cache bash docker git && \
  rm -rf /var/cache/apk/*

RUN git clone --branch v0.2.0 https://github.com/tafm/dagger-gcp-terraform.git /terraformdagger
# RUN copy module/ /terraformdagger/

# Install the Dagger CLI using the official install script
# The CLI is installed to /usr/local/bin by default.
RUN curl -L https://dl.dagger.io/dagger/install.sh | sh

# Set a basic entrypoint for convenience
# This allows the container to be run with the Dagger or Docker command directly.
ENTRYPOINT ["/bin/bash"]