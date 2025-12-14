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
    terraformDir: string,
    credentialsFile: File,
    socket: Socket,
    varsSecret: Secret,
    stateBucket: string
  ): Promise<string> {
    // 1. Define the base Terraform container image
    const terraform: Container = dag
      .container()
      .from("hashicorp/terraform:1.6.4") // Use a stable, specific version
      .withEnvVariable("GOOGLE_APPLICATION_CREDENTIALS", "sa.json")
      .withMountedDirectory("/src", dir)
      .withMountedFile(`/src/${terraformDir}/sa.json`, credentialsFile)
      .withMountedSecret(`/src/${terraformDir}/vars.tfvars`, varsSecret)
      .withWorkdir(`/src/${terraformDir}`)
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
  async deploy(rootDir: Directory, terraformDir: string = 'devops/terraform', credentialsFile: File, socket: Socket, varsSecretName: string, varsSecretFile: Secret | null = null, projectName: string, stateBucket: string) {
    let varsSecret = varsSecretFile;

    if (varsSecret == null) {
      varsSecret = await this.downloadSecret(varsSecretName, credentialsFile, projectName)
    }

    const out = this.apply(rootDir, terraformDir, credentialsFile, socket, varsSecret, stateBucket)

    return out;
  }
}
