import * as cdk from 'aws-cdk-lib';
import { CdnImageDistributionStack } from './stacks/cdn-image-distribution-stack';
// import { Route53Stack } from './stacks/route53-sack';
// import { CertificateStack } from './stacks/certificate-stack';
import { WafStack } from './stacks/waf-stack';

const app = new cdk.App();

// const route53 = new Route53Stack(app, 'Route53CdnStack', {
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION
//   },
// });

// Only in IAD
// const certificateStack = new CertificateStack(app, 'CertificateStack', {
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: "us-east-1"
//   },
//   hostedZoneId: route53.hostedZone.hostedZoneId,
//   hostedZoneName: route53.hostedZone.zoneName,
// });

// Only in IAD
const wafStack = new WafStack(app, 'WafStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1"
  },
});

new CdnImageDistributionStack(app, 'CdnImageDistributionStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
  hostedZoneId: "", //route53.hostedZone.hostedZoneId,
  hostedZoneName: "", //route53.hostedZone.hostedZoneArn,
  certificateArn: "", //certificateStack.certificate.certificateArn
  webAclArn: wafStack.webAcl.attrArn,
});