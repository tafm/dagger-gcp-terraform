import { dag, Container, Directory, object, func, Secret, Socket } from "@dagger.io/dagger"

@object()
export class Dagger {

  @func()
  async downloadSecret(varsSecretName: string, credentialsFile: File, projectName: string) {
    const secretManager = dag.secretManager().gcp()
    
    const secret: Secret = await secretManager.getSecret(varsSecretName, projectName, {
        filePath: credentialsFile,
        version: "latest",
    })

    return secret;
  }

  @func()
  async apply(
    dir: Directory,
    credentialsFile: File,
    socket: Socket,
    varsSecret: Secret,
    stateBucket: string
  ): Promise<string> {
    // const varsParam = await this.downloadSecret(dir, credentialsFile)

    // 1. Define the base Terraform container image
    const terraform: Container = dag
      .container()
      .from("hashicorp/terraform:1.6.4") // Use a stable, specific version
      .withEnvVariable("GOOGLE_APPLICATION_CREDENTIALS", "sa.json")
      .withMountedDirectory("/src", dir)
      .withMountedFile("/src/devops/terraform/sa.json", credentialsFile)
      .withMountedSecret("/src/devops/terraform/vars.tfvars", varsSecret)
      .withWorkdir("/src/devops/terraform")
      .withUnixSocket("/var/run/docker.sock", socket);

    // 2. Initialize Terraform
    const initResult = await terraform
      .withExec(["terraform", "init", "--upgrade", `-backend-config=bucket=${stateBucket}`])

    // 3. Run Terraform Apply (requires auto-approve for non-interactive execution)
    const applyResult = await initResult
      .withExec(["terraform", "apply", "-var-file=vars.tfvars", "-auto-approve"])
      .stdout();

    // Combine and return the output for all steps
    return (
      `--- Terraform Init Output ---\n${initResult}` +
      `\n--- Terraform Apply Output ---\n${applyResult}`
    );
  }

  @func()
  async deploy(terraformDir: Directory, credentialsFile: File, socket: Socket, varsSecretName: string, projectName: string, stateBucket: string) {
    const varsSecret = await this.downloadSecret(varsSecretName, credentialsFile, projectName)
    const out = this.apply(terraformDir, credentialsFile, socket, varsSecret, stateBucket)

    return out;
  }
}
