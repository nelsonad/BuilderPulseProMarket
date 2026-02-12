import { Button, Dialog, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material'
import type { BidAttachmentParseResult } from '../services/bidsService'

type BidAttachmentParsePreviewDialogProps = {
  open: boolean
  result: BidAttachmentParseResult | null
  applying: boolean
  onClose: () => void
  onApply: () => void
}

const formatCurrency = (amountCents: number) => `$${(amountCents / 100).toFixed(2)}`

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

function BidAttachmentParsePreviewDialog({
  open,
  result,
  applying,
  onClose,
  onApply,
}: BidAttachmentParsePreviewDialogProps) {
  const hasContent = Boolean(
    result &&
      (result.amountCents ||
        result.earliestStart ||
        result.durationDays ||
        result.validUntil ||
        result.terms ||
        result.assumptions ||
        result.lineItems.length > 0 ||
        result.variants.length > 0),
  )

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Parsed bid preview</DialogTitle>
      <DialogContent>
        {result ? (
          <Stack spacing={3}>
            {!hasContent ? (
              <Typography color="text.secondary">
                No structured fields were detected in this attachment.
              </Typography>
            ) : null}
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Summary
              </Typography>
              <Stack spacing={0.5}>
                {result.amountCents ? (
                  <Typography>Amount: {formatCurrency(result.amountCents)}</Typography>
                ) : null}
                {result.earliestStart ? (
                  <Typography>Earliest start: {formatDate(result.earliestStart)}</Typography>
                ) : null}
                {result.durationDays ? (
                  <Typography>Duration: {result.durationDays} days</Typography>
                ) : null}
                {result.validUntil ? (
                  <Typography>Valid until: {formatDate(result.validUntil)}</Typography>
                ) : null}
              </Stack>
            </Stack>
            {result.terms ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Terms
                </Typography>
                <Typography>{result.terms}</Typography>
              </Stack>
            ) : null}
            {result.assumptions ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Assumptions
                </Typography>
                <Typography>{result.assumptions}</Typography>
              </Stack>
            ) : null}
            {result.lineItems.length > 0 ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Line items
                </Typography>
                <Stack spacing={1}>
                  {result.lineItems.map((item) => (
                    <Stack key={item.id} spacing={0.25}>
                      <Typography fontWeight={600}>{item.description}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.quantity} × {formatCurrency(item.unitPriceCents)} = {formatCurrency(item.totalCents)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            ) : null}
            {result.variants.length > 0 ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Alternate options
                </Typography>
                <Stack spacing={2}>
                  {result.variants.map((variant) => (
                    <Stack key={variant.id} spacing={1}>
                      <Stack spacing={0.25}>
                        <Typography fontWeight={600}>{variant.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Amount: {formatCurrency(variant.amountCents)}
                        </Typography>
                        {variant.notes ? (
                          <Typography variant="body2" color="text.secondary">
                            Notes: {variant.notes}
                          </Typography>
                        ) : null}
                      </Stack>
                      {variant.lineItems.length > 0 ? (
                        <Stack spacing={0.75}>
                          {variant.lineItems.map((item) => (
                            <Stack key={item.id} spacing={0.2}>
                              <Typography variant="body2" fontWeight={600}>
                                {item.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.quantity} × {formatCurrency(item.unitPriceCents)} = {formatCurrency(item.totalCents)}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      ) : null}
                      <Divider />
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            ) : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={onClose} disabled={applying}>
                Cancel
              </Button>
              <Button variant="contained" disabled={applying} onClick={onApply}>
                Apply to bid
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Typography color="text.secondary">No parsed data available.</Typography>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default BidAttachmentParsePreviewDialog
