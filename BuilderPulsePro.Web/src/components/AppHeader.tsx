import { useState, type MouseEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material'
import { clearAuthToken, getAuthToken } from '../services/storageService'

function AppHeader() {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const isAuthenticated = Boolean(getAuthToken())
  const isOpen = Boolean(anchorEl)

  const handleOpenMenu = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseMenu = () => {
    setAnchorEl(null)
  }

  const handleSignOut = () => {
    clearAuthToken()
    handleCloseMenu()
    navigate('/login')
  }

  return (
    <AppBar position="sticky" color="primary" elevation={0}>
      <Toolbar disableGutters>
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight={700} >
              BuilderPulsePro
            </Typography>
            <Box>
              <IconButton color="inherit" onClick={handleOpenMenu} aria-label="Profile menu">
                <AccountCircleIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={isOpen}
                onClose={handleCloseMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {isAuthenticated ? (
                  <MenuItem component={RouterLink} to="/choose-mode" onClick={handleCloseMenu}>
                    Change Mode
                  </MenuItem>) : (null)}
                {isAuthenticated ? (
                  <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
                ) : (
                  <MenuItem component={RouterLink} to="/login" onClick={handleCloseMenu}>
                    Log In
                  </MenuItem>
                )}
              </Menu>
            </Box>
          </Box>
        </Container>
      </Toolbar>
    </AppBar>
  )
}

export default AppHeader
