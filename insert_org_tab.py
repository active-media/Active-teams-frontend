import sys

with open('src/Pages/Admin.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Content to insert after line 832 (</Paper>)
org_tab = ''''

  // ─── Organization tab content ───────────────────────────────────────────────
  const orgTabContent = () => (
    <Box sx={{ p: getResponsiveValue(1,2,3,3,3), pt: 3 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Organizations</Typography>
      <Grid container spacing={cardSpacing}>
        {organizations.map(org => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={org.id || org._id}>
            <Card sx={cardStyles}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Avatar sx={{ bgcolor: '#1976d2', width: 48, height: 48, boxShadow: 2 }}><BusinessIcon fontSize="small" /></Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{org.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{org.email}</Typography>
                    {org.phone && (
                      <Typography variant="body2" color="text.secondary">
                        <PhoneIcon fontSize="small" /> {org.phone}
                      </Typography>
                    )}
                  </Box>
                </Stack>
                {isSupremeAdmin && (
                  <Box sx={{ display: "flex", justifyContent: "flex-end", my: 1 }}>
                    <Button variant="outlined" size="small" startIcon={<EditIcon />} sx={{ mr: 1, borderRadius: 1 }} onClick={() => { setEditingOrg(org); setShowOrgModal(true); }}>Edit</Button>
                    <Button variant="outlined" size="small" startIcon={<Delete />} sx={{ ml: 1, borderRadius: 1, color: "error.main"}} onClick={() => { if (window.confirm("Delete " + org.name + "? This cannot be undone.")) { handleDeleteOrganization(org.id || org._id, org.name); }}>Delete</Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
        {organizations.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <BusinessIcon fontSize={60} color="text.secondary" mb={2} /> <Typography variant="h6" color="text.secondary">No organizations found</Typography>
          </Box>
        )}
      </Grid>
      {isSupremeAdmin && (
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateOrg} sx={{ boxShadow: 1, borderRadius: 2, width: "100%" }}>
            <Typography variant="body1">Create New Organization</Typography>
          </Button>
        </Box>
      )}
    </Box>
  );
'''

# Insert after line 832 (0-based). The </Paper> line is at index 832.
# Insert at index 833 (before the blank line at 833, pushing everything down)
lines.insert(833, org_tab)

with open('src/Pages/Admin.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Inserted org tab content at position 833')
print(f'Total lines now: {len(lines)}')