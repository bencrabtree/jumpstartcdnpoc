import * as cdk from "aws-cdk-lib";
import * as r53 from "aws-cdk-lib/aws-route53";

const DOMAIN_NAME = 'bencrab-personal.com';

interface Route53Props extends cdk.StackProps { }

export class Route53Stack extends cdk.Stack {
    readonly hostedZone: r53.HostedZone;

    constructor(scope: cdk.App, id: string, props: Route53Props) {
        super(scope, id, props);

        const zoneName = `bencrab.personal.static.${props.env?.region}.${DOMAIN_NAME}`;

        this.hostedZone = new r53.HostedZone(this, 'BenCrab-StaticAssets-HostedZone', {
            zoneName: zoneName,
            comment: `Public Hosted zone for BenCrab web app static access - DO NOT DELETE`
        });
    }
}