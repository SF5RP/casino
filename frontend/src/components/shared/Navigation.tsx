import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Casino, Home, Extension } from "@mui/icons-material";
import Link from "next/link";

export const Navigation = () => {
  return (
    <AppBar position="static" sx={{ backgroundColor: "#2a2a2a" }}>
      <Toolbar>
        <Casino sx={{ mr: 2, fontSize: 28 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Casino
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            color="inherit"
            component={Link}
            href="/"
            startIcon={<Home />}
          >
            Главная
          </Button>
          <Button
            color="inherit"
            component={Link}
            href="/memory-game"
            startIcon={<Extension />}
          >
            Найди пару
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
