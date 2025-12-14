# Simple Terraform GCP Dagger Deployer

## Motivation

After writing again and again yaml pipelines close to the same just to apply my projects terraform infrastructure i decided to write this very simple dagger module to reuse the same pipeline for my projects

## How it works

### Module

The module at its own folder is a very simple typescript dagger module that can download a .tfvars file from GCP secret manager and deploy the terraform infrastructure.

This module assumes that you terraform module will be at
"devops/terraform" folder. To use a custom directory use the --terraform-dir parameter with a value in replace of the default "devops/terraform"

### Image

The idea with the image is to give in a easier way a dagger distribution compatible with this module and with the module itself embedded at the image.

### Security concerns

Because that module manages very sensitive data in production enviroments i trully recommended that you build you own image from that Dockerfile instead using my pre-builded image, but fell free to use for testing.

## Running locally

### With local dagger instalation

Clone this repository at some CUSTOM-FOLDER

```bash
dagger call \
-m CUSTOM-FOLDER/module deploy \
--root-dir YOUR-CODE-REPOSITORY-FOLDER \
--credentials-file SERVICE-ACCOUNT-JSON-FILE-PATH \
--socket unix:///var/run/docker.sock \
--project-name GCP-PROJECT-NAME \
--state-bucket=GCP-STATE-BUCKET \
--vars-secret-file=file://TF-VARS-PATH \
--progress=plain 

```

### With a pre-builded image

```bash
docker run --rm \
--entrypoint dagger \
--workdir /src \
-v CODE-ROOT-DIRECTORY:/src \
-v SERVICE-ACCOUNT-KEY-FILE:/src/devops/terraform/sa.json \
-v VARS-FILE:/src/devops/terraform/vars.tfvars \
-v /var/run/docker.sock:/var/run/docker.sock \
-it thomasandersonn/dagger-gcp-terraform:v0.19.8-build-4 call \
-m /terraformdagger/module/.dagger deploy \
--root-dir /src \
--credentials-file /src/devops/terraform/sa.json \
--socket unix:///var/run/docker.sock \
--project-name GCP-PROJECT-NAME \
--state-bucket=GCP-STATE-BUCKET \
--vars-secret-file=file:///src/devops/terraform/vars.tfvars
```