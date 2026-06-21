import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'

export interface ObservabilityProps {
  readonly fn: NodejsFunction
}

/**
 * Starter observability for the API function (Well-Architected: Operational Excellence).
 *
 * X-Ray tracing is enabled on the function itself (see compute.ts). Here we add a
 * CloudWatch dashboard (invocations / errors / duration) and an alarm on any errors, so
 * there's something concrete to point at when asked "how would you operate this?".
 *
 * For "real": add alarms for p99 latency, throttles, and Aurora ACU utilization, wire
 * SNS notifications, and consider CloudWatch Synthetics canaries against /health.
 */
export class Observability extends Construct {
  constructor(scope: Construct, id: string, props: ObservabilityProps) {
    super(scope, id)

    const errorsAlarm = props.fn
      .metricErrors({ period: cdk.Duration.minutes(5) })
      .createAlarm(this, 'ApiErrorsAlarm', {
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: 'Workout Tracker API Lambda reported errors',
      })

    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: 'WorkoutTracker-API',
    })
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Invocations & Errors',
        left: [props.fn.metricInvocations(), props.fn.metricErrors()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Duration (p50/p95/p99)',
        left: [
          props.fn.metricDuration({ statistic: 'p50' }),
          props.fn.metricDuration({ statistic: 'p95' }),
          props.fn.metricDuration({ statistic: 'p99' }),
        ],
        width: 12,
      }),
      new cloudwatch.AlarmWidget({ title: 'API Errors Alarm', alarm: errorsAlarm, width: 12 }),
    )
  }
}
