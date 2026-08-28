import { Construct } from 'constructs'
import * as budgets from 'aws-cdk-lib/aws-budgets'

export interface BudgetAlarmProps {
  readonly notificationEmail: string
  readonly monthlyLimitUsd?: number
}

/**
 * Account-wide monthly cost budget with email alerts. This is a spending safety net,
 * separate from the Anthropic API's own console spend cap — this one covers total AWS
 * spend (Aurora, Lambda, CloudFront, etc.), not just the photo-scan feature's API usage.
 *
 * Alerts at 50% / 80% / 100% of actual spend, plus a forecasted-to-exceed-100% warning so
 * you find out before the month ends, not after.
 */
export class BudgetAlarm extends Construct {
  constructor(scope: Construct, id: string, props: BudgetAlarmProps) {
    super(scope, id)

    const limit = props.monthlyLimitUsd ?? 20
    const subscribers: budgets.CfnBudget.SubscriberProperty[] = [
      { subscriptionType: 'EMAIL', address: props.notificationEmail },
    ]

    const notification = (
      threshold: number,
      notificationType: 'ACTUAL' | 'FORECASTED'
    ): budgets.CfnBudget.NotificationWithSubscribersProperty => ({
      notification: {
        comparisonOperator: 'GREATER_THAN',
        notificationType,
        threshold,
        thresholdType: 'PERCENTAGE',
      },
      subscribers,
    })

    new budgets.CfnBudget(this, 'MonthlyCostBudget', {
      budget: {
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetName: 'workout-tracker-monthly',
        budgetLimit: { amount: limit, unit: 'USD' },
      },
      notificationsWithSubscribers: [
        notification(50, 'ACTUAL'),
        notification(80, 'ACTUAL'),
        notification(100, 'ACTUAL'),
        notification(100, 'FORECASTED'),
      ],
    })
  }
}
