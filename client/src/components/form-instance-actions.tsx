import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FormInstance } from "@shared/schema";
import { AlertTriangle, Lock, Unlock, X, CheckCircle2, Clock } from "lucide-react";

interface FormInstanceActionsProps {
  formInstance: FormInstance;
  onUpdate: () => void;
}

export function FormInstanceActions({ formInstance, onUpdate }: FormInstanceActionsProps) {
  const { toast } = useToast();
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [isUnlockDialogOpen, setIsUnlockDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Draft</Badge>;
      case "ready_to_sign":
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Ready to Sign</Badge>;
      case "locked":
        return <Badge variant="default" className="flex items-center gap-1"><Lock className="h-3 w-3" /> Locked</Badge>;
      case "completed":
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case "voided":
        return <Badge variant="destructive" className="flex items-center gap-1"><X className="h-3 w-3" /> Voided</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for voiding this form instance.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", `/api/form-instances/${formInstance.id}/void`, {
        voidedBy: "admin", // TODO: Get from auth context
        reason: voidReason,
      });
      
      toast({
        title: "Form instance voided",
        description: "The form instance has been successfully voided.",
      });
      
      setIsVoidDialogOpen(false);
      setVoidReason("");
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error voiding form instance",
        description: error?.response?.data?.error || "Failed to void form instance",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = async () => {
    setIsLoading(true);
    try {
      await apiRequest("POST", `/api/form-instances/${formInstance.id}/unlock`, {
        unlockedBy: "admin", // TODO: Get from auth context
      });
      
      toast({
        title: "Form instance unlocked",
        description: "The form instance has been unlocked. All signatures have been cleared and signatories will need to re-sign.",
      });
      
      setIsUnlockDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error unlocking form instance",
        description: error?.response?.data?.error || "Failed to unlock form instance",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canVoid = formInstance.status !== "voided";
  const canUnlock = formInstance.status === "locked" || formInstance.status === "completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Form Instance Status</span>
          {getStatusBadge(formInstance.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Information */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            <strong>Created:</strong> {new Date(formInstance.createdAt).toLocaleString()}
          </div>
          {formInstance.lockedAt && (
            <div className="text-sm text-muted-foreground">
              <strong>Locked:</strong> {new Date(formInstance.lockedAt).toLocaleString()}
            </div>
          )}
          {formInstance.completedAt && (
            <div className="text-sm text-muted-foreground">
              <strong>Completed:</strong> {new Date(formInstance.completedAt).toLocaleString()}
            </div>
          )}
          {formInstance.voidedAt && (
            <div className="text-sm text-muted-foreground">
              <strong>Voided:</strong> {new Date(formInstance.voidedAt).toLocaleString()}
              {formInstance.voidedBy && (
                <span> by {formInstance.voidedBy}</span>
              )}
            </div>
          )}
          {formInstance.voidedReason && (
            <div className="text-sm text-muted-foreground">
              <strong>Reason:</strong> {formInstance.voidedReason}
            </div>
          )}
          {formInstance.unlockedAt && (
            <div className="text-sm text-muted-foreground">
              <strong>Unlocked:</strong> {new Date(formInstance.unlockedAt).toLocaleString()}
              {formInstance.unlockedBy && (
                <span> by {formInstance.unlockedBy}</span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canVoid && (
            <Dialog open={isVoidDialogOpen} onOpenChange={setIsVoidDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Void
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Void Form Instance</DialogTitle>
                  <DialogDescription>
                    This will permanently void this form instance. It will no longer be accessible to signatories.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="void-reason">Reason for voiding</Label>
                    <Textarea
                      id="void-reason"
                      placeholder="Enter reason for voiding this form instance..."
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsVoidDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleVoid} disabled={isLoading}>
                    {isLoading ? "Voiding..." : "Void Form Instance"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canUnlock && (
            <Dialog open={isUnlockDialogOpen} onOpenChange={setIsUnlockDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Unlock className="h-4 w-4 mr-1" />
                  Unlock
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Unlock Form Instance</DialogTitle>
                  <DialogDescription>
                    This will unlock the form instance and clear all existing signatures. 
                    All signatories will need to re-sign the form.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This action will clear all existing signatures and require all signatories to re-sign the form.
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUnlockDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={handleUnlock} disabled={isLoading}>
                    {isLoading ? "Unlocking..." : "Unlock Form Instance"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
