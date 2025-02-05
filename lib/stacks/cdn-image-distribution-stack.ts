import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
// import * as r53 from "aws-cdk-lib/aws-route53";
// import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
// import * as acm from 'aws-cdk-lib/aws-certificatemanager';

interface CdnImageDistributionStackProps extends cdk.StackProps {
  certificateArn: string;
  hostedZoneName: string;
  hostedZoneId: string;
  webAclArn: string;
}

export class CdnImageDistributionStack extends cdk.Stack {
  readonly distribution: cloudfront.Distribution;
  readonly bucket: s3.Bucket;

  constructor(
    scope: Construct,
    id: string,
    props: CdnImageDistributionStackProps
  ) {
    super(scope, id, props);
    const { webAclArn, hostedZoneName, hostedZoneId, certificateArn } = props;

    // Create an S3 bucket to store images
    this.bucket = new s3.Bucket(this, "bencrab-cdn-bucketorigin", {
      bucketName: "bencrab-cdn-bucketorigin",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
      autoDeleteObjects: true, // NOT recommended for production
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    // Certificate from DNS certifying domain ownership
    // const certificate = acm.Certificate.fromCertificateArn(
    //   this,
    //   'bencrab-cdn-certificate',
    //   certificateArn
    // );

    // Stores DNS records connecting CF to domain
    // const hostedZone = r53.HostedZone.fromHostedZoneAttributes(
    //   this,
    //   "imported-hosted-zone",
    //   {
    //     hostedZoneId,
    //     zoneName: hostedZoneName,
    //   }
    // );

    // Create Origin Access Control for CloudFront to access S3
    const cfnOac = new cloudfront.CfnOriginAccessControl(
      this,
      "bencrab-cdn-oac",
      {
        originAccessControlConfig: {
          name: "bencrab-cdn-oac",
          originAccessControlOriginType: "s3",
          signingBehavior: "always",
          signingProtocol: "sigv4",
        },
      }
    );

    const functionAssociations = this.createFunctionAssociations();

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(
      this,
      "bencrab-cdn-imagedistro",
      {
        defaultBehavior: {
          origin: new origins.S3Origin(this.bucket),
          functionAssociations: functionAssociations,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          compress: true,
        },
        comment: "CDN for image distribution",
        ...(webAclArn ? { webAclId: webAclArn } : undefined),
        // domainNames: [hostedZone.zoneName],
        // certificate
      }
    );

    // Configure distribution overrides for OAC. Explicitly disable OAI
    const cfnDistribution = this.distribution.node.defaultChild as cloudfront.CfnDistribution;
    cfnDistribution.addOverride("Properties.DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity", "");
    cfnDistribution.addPropertyOverride("DistributionConfig.Origins.0.OriginAccessControlId", cfnOac.attrId);

    // Configure bucket policy
    const bucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
      resources: [`${this.bucket.bucketArn}/*`],
      actions: ["s3:GetObject"],
      conditions: {
        StringEquals: {
          "AWS:SourceArn": this.distribution.distributionArn,
        },
      },
    });
    this.bucket.addToResourcePolicy(bucketPolicy);

    // Create DNS record pointing to CF. Only if using custom domain
    // new r53.ARecord(this, 'Monarch-Cloudfront-ARecord', {
    //   zone: hostedZone,
    //   target: r53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    //   comment: 'A-Record for Monarch web app cloudfront distribution',
    //   recordName: hostedZone.zoneName
    // });

    this.createCloudFormationOutputs();
  }

  /**
   * Creates middleware function associations for CloudFront distribution.
   *
   * @returns Array of CloudFront function associations to be applied to the distribution
   */
  private createFunctionAssociations(): cloudfront.FunctionAssociation[] {
    const functionAssociations: cloudfront.FunctionAssociation[] = [];

    // Add security headers to the response
    const viewerResponseFunction = new cloudfront.Function(this, "Function", {
      code: cloudfront.FunctionCode.fromFile({
        filePath: "lib/cf-fns/viewer-response.js",
      }),
    });
    const viewerResponsFunctionAssociation: cloudfront.FunctionAssociation = {
      eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
      function: viewerResponseFunction,
    }
    functionAssociations.push(viewerResponsFunctionAssociation);

    return functionAssociations;
  }

  /**
   * Creates CloudFormation outputs for the stack
   */
  private createCloudFormationOutputs(): void {
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: "The domain name of the CloudFront distribution",
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      description: "The name of the S3 bucket",
    });
  }
}
