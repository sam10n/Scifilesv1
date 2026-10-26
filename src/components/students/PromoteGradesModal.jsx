const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowUpCircle } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";

export default function PromoteGradesModal({ open, onClose, students, onSuccess }) {
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [promoting, setPromoting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const now = new Date();
      const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      setStartYear(String(y));
      setEndYear(String(y + 1));
    }
  }, [open]);

  const newYearLabel = startYear && endYear ? `${startYear}-${endYear}` : "";
  const eligible = students.filter((s) => s.grade_number != null && s.last_promoted_year !== newYearLabel);
  const skipped = students.length - eligible.length;

  const handlePromote = async () => {
    if (!newYearLabel || eligible.length === 0) return;
    setPromoting(true);
    try {
      const updates = eligible.map((s) => ({
        id: s.id,
        grade_number: (s.grade_number || 0) + 1,
        grade: `Grade ${(s.grade_number || 0) + 1}`,
        last_promoted_year: newYearLabel,
      }));
      await db.entities.Student.bulkUpdate(updates);
      toast({ title: "Grades promoted", description: `${updates.length} student(s) promoted to ${newYearLabel}.` });
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: "Promotion failed", description: err.message, variant: "destructive" });
    } finally {
      setPromoting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-blue-600" /> Promote Grades
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set the new school year. All students with a grade level will be promoted by one grade automatically.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>School Year Start</Label>
              <Input type="number" value={startYear} onChange={(e) => setStartYear(e.target.value)} placeholder="e.g. 2026" />
            </div>
            <div>
              <Label>School Year End</Label>
              <Input type="number" value={endYear} onChange={(e) => setEndYear(e.target.value)} placeholder="e.g. 2027" />
            </div>
          </div>
          {newYearLabel && (
            <div className="bg-blue-50 dark:bg-blue-950/50 rounded-xl p-4 space-y-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {eligible.length} student{eligible.length !== 1 ? "s" : ""} will be promoted to {newYearLabel}
              </p>
              {skipped > 0 && (
                <p className="text-xs text-blue-500 dark:text-blue-400">
                  {skipped} student{skipped !== 1 ? "s" : ""} skipped (no grade level set or already promoted)
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={promoting}>Cancel</Button>
          <Button onClick={handlePromote} disabled={promoting || !newYearLabel || eligible.length === 0}>
            {promoting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Promoting...</> : `Promote ${eligible.length} Student${eligible.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}