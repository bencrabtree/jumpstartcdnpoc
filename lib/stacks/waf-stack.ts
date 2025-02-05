import * as cdk from "aws-cdk-lib";
import * as waf from 'aws-cdk-lib/aws-wafv2';
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from "constructs";

const bencrabPersonalIp = '71.105.135.50/32';

interface WafStackProps extends cdk.StackProps { }

export class WafStack extends cdk.Stack {
    readonly webAcl: waf.CfnWebACL;

    constructor(scope: Construct, id: string, props: WafStackProps) {
        super(scope, id, props);

        const ipSet = new waf.CfnIPSet(
            this,
            `WafIpSet-${id}`,
            {
                name: `WafIpSet-${id}`,
                ipAddressVersion: 'IPV4',
                scope: 'CLOUDFRONT',
                description: 'Contains IP addresses for allowlisted callers',
                addresses: [bencrabPersonalIp],
            }
        );

        const ipBasedWebACLRule: waf.CfnWebACL.RuleProperty = {
            name: `AllowWafIpSet-${id}`,
            action: { allow: {} },
            // ensure ip based rule is evaluated first
            priority: 0,
            statement: {
                ipSetReferenceStatement: {
                    arn: ipSet.attrArn,
                },
            },
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: `IpBasedWebACLRuleMetric-${id}`,
                sampledRequestsEnabled: true,
            },
        };

        // Ask Wenjie why they don't deploy WAF to prod/preprod
        this.webAcl = new waf.CfnWebACL(this, 'WebACL', {
            defaultAction: { allow: {} }, // change to block once ip set is figured out
            scope: 'CLOUDFRONT',
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: 'WebACL',
                sampledRequestsEnabled: true,
            },
            rules: [
                ipBasedWebACLRule,
                // Add rules here, e.g., rate limiting, geo-restriction, etc.
            ],
        });

        // CloudWatch Log Group
        const logGroup = new logs.LogGroup(this, 'WafLogGroup', {
            logGroupName: 'aws-waf-logs-cdn', // need 'aws-waf-logs-' prefix
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // WAF logging configuration
        new waf.CfnLoggingConfiguration(this, 'WafLogging', {
            resourceArn: this.webAcl.attrArn,
            logDestinationConfigs: [logGroup.logGroupArn],
        });

        // Grant WAF permissions to write to CloudWatch Logs
        logGroup.grantWrite(new iam.ServicePrincipal('waf.amazonaws.com'));
    }
};