import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { DashboardSubscriptionData } from "@/utils/dashboard-data";

interface SubscriptionCardProps {
  subscriptionData: DashboardSubscriptionData;
}

export function SubscriptionCard({ subscriptionData }: SubscriptionCardProps) {
  if (!subscriptionData.hasActiveSubscription) {
    return (
      <Link href="/pricing">
        <Button className="ml-2 font-bold flex items-center gap-2 cursor-pointer">
          Iscriviti Subito
          <Crown className="h-4 w-4 text-white" />
        </Button>
      </Link>
    );
  }

  return (
    <div className="w-full md:w-auto border rounded-lg items-center justify-center h-full">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10">
          <Crown className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{subscriptionData.planName}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {subscriptionData.daysUntilRenewal !== null ? (
              subscriptionData.daysUntilRenewal <= 0 ? (
                <span>Rinnovo oggi</span>
              ) : subscriptionData.daysUntilRenewal === 1 ? (
                <span>Rinnovo domani</span>
              ) : (
                <span>
                  Rinnovo tra {subscriptionData.daysUntilRenewal} giorni
                </span>
              )
            ) : (
              <span>Rinnovo {subscriptionData.renewalDate}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
