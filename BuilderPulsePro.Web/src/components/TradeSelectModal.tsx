import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ToggleButton,
} from '@mui/material'
import { tradeOptions } from '../utils/trades'

type TradeSelectModalProps = {
  open: boolean
  selectedTrades: string[]
  onClose: () => void
  onChange: (nextTrades: string[]) => void
}

const TradeSelectModal = ({ open, selectedTrades, onClose, onChange }: TradeSelectModalProps) => {
  const handleToggle = (trade: string) => {
    const nextTrades = selectedTrades.includes(trade)
      ? selectedTrades.filter((item) => item !== trade)
      : [...selectedTrades, trade]
    onChange(nextTrades)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Select trades
        <IconButton onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 1.5,
          }}
        >
          {tradeOptions.map((trade) => (
            <ToggleButton
              key={trade}
              value={trade}
              selected={selectedTrades.includes(trade)}
              onClick={() => handleToggle(trade)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  borderColor: 'primary.main',
                  color: 'primary.contrastText',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: 'primary.dark',
                  borderColor: 'primary.dark',
                },
              }}
              fullWidth
            >
              {trade}
            </ToggleButton>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TradeSelectModal
