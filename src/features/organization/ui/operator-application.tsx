"use client";

import type { ComponentProps } from "react";
import { ApplicationDetail } from "@/features/applications/ui/application-detail";
import { StatusForm } from "./status-form";

type Props = Omit<ComponentProps<typeof ApplicationDetail>, "mode" | "actions">;

/** An application as the operator sees it: the same card, with the status form under it. */
export function OperatorApplication(props: Props) {
  return (
    <ApplicationDetail
      {...props}
      mode="operator"
      actions={(application) => (
        <StatusForm application={application} labels={props.dict.operator.change} />
      )}
    />
  );
}
