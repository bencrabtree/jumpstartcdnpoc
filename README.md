# CDN Image Distribution

This project creates an AWS CDK application that deploys a CDN for distributing images from an S3 bucket using CloudFront.

## Architecture

The stack creates:
- An S3 bucket for storing images
- A CloudFront distribution that serves the images from the S3 bucket
- Appropriate security settings and access controls

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Security Notes

For production use, consider:
- Removing the `removalPolicy: DESTROY` and `autoDeleteObjects: true` from the S3 bucket
- Adding WAF rules to the CloudFront distribution
- Implementing additional security headers
- Setting up appropriate CORS configurations if needed
- Adding custom domain names and SSL certificates