# Pay with Toonie SDK

## Deployment

To deploy the application please follow this steps:
- Create and push to GitHub a commit to the `develop` branch with the new version of the app you want to deploy.
  For example `build: Release 1.2.3`. Remember to update the `package.json` version.
- Create a branch starting from the `develop` one, naming it following this convention: `release/{{dev|demo|prod}}/{{versionNumber}}`.
  For example: `release/demo/prod/1.2.3`. You can specify more than one environment in which to deploy.
- Push the branch. The push action will trigger the correct [deployment script](./.github/workflows/deployment.yaml) which will automatically handle the deployment for the app in the environment(s) you specified on the branch name.
  You can download the artifact built as a result on the action page ![artifact](https://github.com/portittech/pay-with-toonie-js-sdk/assets/89908315/7f3777e1-04ce-43fe-a063-9aba2b410364)

## Publishing

To publish the package to npm and GitHub please follow these steps:
- Verify that the version on the [package.json](./package.json) file has been dumped.
- Create and push the tag for the new version. Specify the environment(s) in which it has been release and the version.
  For example: `demo-prod-1.2.3`
- Go to the [repository releases page](https://github.com/portittech/pay-with-toonie-js-sdk/releases) and create a version from the new created tag. 
  This will trigger the [publish script](./.github/workflows/publish.yaml) which will publish the package to npm and GitHub.