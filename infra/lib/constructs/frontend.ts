import * as fs from 'fs'
import * as path from 'path'
import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'

export interface FrontendProps {
  /** Domain of the HTTP API (no protocol/path), used as the /api/* origin. */
  readonly apiDomain: string
}

/**
 * The React SPA on S3, delivered via CloudFront.
 *
 *  - S3 bucket is fully private; CloudFront reaches it via Origin Access Control (OAC).
 *  - CloudFront also proxies `/api/*` to the HTTP API, so the browser is single-origin
 *    (no CORS) and the API gets edge TLS + WAF coverage. A tiny CloudFront Function strips
 *    the `/api` prefix so the origin sees `/workouts`, `/auth/...`, etc.
 *  - SPA deep links: 403/404 are rewritten to /index.html so client-side routing works.
 *
 * For "real": attach an ACM cert + custom domain (Route 53) and an AWS WAF WebACL. Left
 * off here so the demo deploys with zero DNS prerequisites.
 */
export class Frontend extends Construct {
  public readonly distributionDomainName: string
  public readonly bucketName: string

  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id)

    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // demo
      autoDeleteObjects: true, // demo: empty the bucket on destroy
    })
    this.bucketName = bucket.bucketName

    // Strip the leading "/api" before the request hits the HTTP API origin.
    const apiPathRewrite = new cloudfront.Function(this, 'ApiPathRewrite', {
      code: cloudfront.FunctionCode.fromInline(
        "function handler(event){var r=event.request;r.uri=r.uri.replace(/^\\/api/,'')||'/';return r;}"
      ),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    })

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        // API traffic: never cache, forward viewer headers (incl. Authorization), strip /api.
        '/api/*': {
          origin: new origins.HttpOrigin(props.apiDomain),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          functionAssociations: [
            { function: apiPathRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
          ],
        },
      },
      // SPA client-side routing: serve index.html for not-found paths.
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // NA + EU edges; cheapest
      comment: 'Workout Tracker SPA + /api proxy',
    })
    this.distributionDomainName = distribution.distributionDomainName

    // Optional: if the SPA has been built (client/dist exists), upload it and invalidate.
    // Build first with:  cd client && VITE_API_BASE=/api npm run build
    const distPath = path.join(__dirname, '..', '..', '..', 'client', 'dist')
    if (fs.existsSync(distPath)) {
      new s3deploy.BucketDeployment(this, 'DeploySite', {
        sources: [s3deploy.Source.asset(distPath)],
        destinationBucket: bucket,
        distribution,
        distributionPaths: ['/*'],
      })
    }
  }
}
