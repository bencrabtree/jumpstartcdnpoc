import * as cdk from "aws-cdk-lib";
import * as r53 from "aws-cdk-lib/aws-route53";
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from "constructs";

interface CertificateStackProps extends cdk.StackProps {
  hostedZoneName: string;
  hostedZoneId: string;
}

export class CertificateStack extends cdk.Stack {
  readonly certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props);

    const { hostedZoneName, hostedZoneId } = props;

    const hostedZone = r53.HostedZone.fromHostedZoneAttributes(
      this,
      "imported-hosted-zone",
      {
        hostedZoneId,
        zoneName: hostedZoneName,
      }
    );

    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: hostedZone.zoneName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });
  }
}
