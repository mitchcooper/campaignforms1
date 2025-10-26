import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pen, Type, CheckCircle2, Clock, X } from "lucide-react";

interface SignatureData {
  type: "canvas" | "typed";
  data: string;
  timestamp: string;
  signatory?: string;
  signingDate?: string; // Today's date in YYYY-MM-DD format
  formattedTimestamp?: string; // Formatted timestamp for display
}

interface SignatureFieldProps {
  id: string;
  label: string;
  required?: boolean;
  signatory?: string;
  value?: SignatureData;
  onChange: (value: SignatureData | null) => void;
  disabled?: boolean;
  signedBy?: string;
  signedAt?: string;
  captureTimestamp?: boolean;
  timestampFormat?: string;
  embedTimestamp?: boolean;
  onSignatureConfirmed?: () => void;
}

export function SignatureField({
  id,
  label,
  required = true,
  signatory,
  value,
  onChange,
  disabled = false,
  signedBy,
  signedAt,
  captureTimestamp = true,
  timestampFormat = "d MMM yyyy, h:mm a zzz",
  embedTimestamp = true,
  onSignatureConfirmed,
}: SignatureFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"canvas" | "typed">("canvas");
  const [typedName, setTypedName] = useState("");
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<SignatureData | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up canvas
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // If we have existing signature data, redraw it
    if (value?.type === "canvas" && value.data) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = value.data;
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || mode !== "canvas") return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled || mode !== "canvas") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if there's any drawing on the canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((pixel, index) => 
      index % 4 === 3 && pixel > 0 // Check alpha channel
    );

    if (hasContent) {
      const now = new Date();
      const signatureData: SignatureData = {
        type: "canvas",
        data: canvas.toDataURL(),
        timestamp: now.toISOString(),
        signatory: signatory,
        signingDate: now.toISOString().split('T')[0], // Today's date
        formattedTimestamp: captureTimestamp ? formatTimestamp(now, timestampFormat) : undefined,
      };
      setPendingSignature(signatureData);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
    setHasSignature(false);
  };

  const handleTypedSignature = () => {
    if (!typedName.trim() || !agreementChecked || disabled) return;

    const now = new Date();
    const signatureData: SignatureData = {
      type: "typed",
      data: typedName.trim(),
      timestamp: now.toISOString(),
      signatory: signatory,
      signingDate: now.toISOString().split('T')[0], // Today's date
      formattedTimestamp: captureTimestamp ? formatTimestamp(now, timestampFormat) : undefined,
    };
    setPendingSignature(signatureData);
  };

  const confirmSignature = () => {
    if (!pendingSignature) return;
    
    onChange(pendingSignature);
    setHasSignature(true);
    setPendingSignature(null);
    onSignatureConfirmed?.();
  };

  const clearPendingSignature = () => {
    setPendingSignature(null);
    if (mode === "canvas") {
      clearSignature();
    } else {
      setTypedName("");
      setAgreementChecked(false);
    }
  };

  const formatTimestamp = (date: Date, format: string) => {
    // Simple format implementation for common patterns
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Pacific/Auckland', // NZST/NZDT
    };
    
    if (format.includes('d MMM yyyy')) {
      options.day = 'numeric';
      options.month = 'short';
      options.year = 'numeric';
    }
    if (format.includes('h:mm a')) {
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.hour12 = true;
    }
    if (format.includes('zzz')) {
      options.timeZoneName = 'short';
    }
    
    return date.toLocaleString('en-NZ', options);
  };

  const formatDisplayTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // If already signed by someone else, show read-only view
  if (signedBy && signedBy !== signatory) {
    return (
      <div className="space-y-2">
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Signed by {signedBy}</span>
            {signedAt && (
              <span className="text-xs">
                on {formatTimestamp(signedAt)}
              </span>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // If already signed by this user, show completed state
  if (hasSignature || value) {
    return (
      <div className="space-y-2">
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="space-y-3">
            {/* Signature Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Signature captured
                </span>
              </div>
              <div className="flex items-center gap-2">
                {embedTimestamp && value?.formattedTimestamp && (
                  <Badge variant="outline" className="text-xs">
                    {value.formattedTimestamp}
                  </Badge>
                )}
                {!embedTimestamp && (
                  <Badge variant="outline" className="text-xs">
                    {formatDisplayTimestamp(value?.timestamp || new Date().toISOString())}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Signature Details */}
            <div className="space-y-2">
              {value?.type === "canvas" && value?.data && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-600">Captured signature:</div>
                  <div className="border border-gray-200 rounded p-2 bg-white">
                    <img 
                      src={value.data} 
                      alt="Captured signature" 
                      className="max-w-full h-auto max-h-20 object-contain"
                    />
                  </div>
                </div>
              )}
              
              {value?.type === "typed" && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Signed as:</div>
                  <div className="text-sm font-medium text-gray-800">{value.data}</div>
                </div>
              )}
              
              {/* Signatory info */}
              <div className="text-xs text-gray-500">
                <span>Signatory: {signatory || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // If there's a pending signature, show confirmation UI
  if (pendingSignature) {
    return (
      <div className="space-y-2">
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="space-y-3">
            {/* Pending Status */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Review your signature
              </span>
            </div>
            
            {/* Pending Signature Preview */}
            <div className="space-y-2">
              {pendingSignature.type === "canvas" && pendingSignature.data && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-600">Your signature:</div>
                  <div className="border border-gray-200 rounded p-2 bg-white">
                    <img 
                      src={pendingSignature.data} 
                      alt="Pending signature" 
                      className="max-w-full h-auto max-h-20 object-contain"
                    />
                  </div>
                </div>
              )}
              
              {pendingSignature.type === "typed" && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-600">Signed as:</div>
                  <div className="text-sm font-medium text-gray-800">{pendingSignature.data}</div>
                </div>
              )}
              
              {/* Signatory info */}
              <div className="text-xs text-gray-500">
                <span>Signatory: {signatory || 'Unknown'}</span>
              </div>
            </div>
            
            {/* Confirmation Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={confirmSignature}
                className="flex-1"
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Sign
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={clearPendingSignature}
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Redo
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Label removed - will be handled by the form section */}

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "canvas" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("canvas")}
          disabled={disabled}
        >
          <Pen className="h-4 w-4 mr-2" />
          Draw Signature
        </Button>
        <Button
          type="button"
          variant={mode === "typed" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("typed")}
          disabled={disabled}
        >
          <Type className="h-4 w-4 mr-2" />
          Type Name
        </Button>
      </div>

      {/* Canvas Mode */}
      {mode === "canvas" && (
        <div className="space-y-2">
          <Card className="p-4">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="border border-gray-300 rounded cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              style={{ touchAction: "none" }}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-muted-foreground">
                Draw your signature above
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignature}
                disabled={disabled}
              >
                Clear
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Typed Mode */}
      {mode === "typed" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Input
              placeholder="Type your full name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              disabled={disabled}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${id}-agreement`}
                checked={agreementChecked}
                onCheckedChange={(checked) => setAgreementChecked(!!checked)}
                disabled={disabled}
              />
              <Label
                htmlFor={`${id}-agreement`}
                className="text-sm text-muted-foreground"
              >
                I agree this is my signature
              </Label>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleTypedSignature}
            disabled={!typedName.trim() || !agreementChecked || disabled}
            className="w-full"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirm Signature
          </Button>
        </div>
      )}

      {/* Signatory Info */}
      {signatory && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Signing as: {signatory}</span>
        </div>
      )}
    </div>
  );
}


