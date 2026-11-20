import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormGroup, FormControlLabel, Checkbox, Radio, Box, Typography,
} from '@mui/material';
import { ALL_PAGES } from '../utils/pages';
import { saveOrgRoles } from '../services/orgRoles';

/**
 * Lets a super admin create/edit an organization's roles:
 *  - name + description
 *  - which pages the role can access
 *  - which ONE role is the default for new signups
 *
 * Props:
 *  open, orgId, orgName
 *  initialRoles  - roles currently saved for the org ([] for a brand-new org)
 *  roleCounts    - { roleName: numberOfUsers }, used to warn before removing a role in use
 *  lockNames     - true when editing saved roles, false for a brand-new org's starter roles
 *  onClose(saved: boolean)
 */
export default function OrgRolesModal({
  open, orgId, orgName, initialRoles = [], roleCounts = {}, lockNames = true, onClose,
}) {
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset the form every time the modal opens
  useEffect(() => {
    if (!open) return;
    setRoles(
      initialRoles.map(r => ({
        name: r.name,
        description: r.description || '',
        pages: r.pages || [],
        is_default: !!r.is_default,
        _existing: lockNames, // saved roles keep their name (users reference it); new-org starter roles stay editable
      }))
    );
    setError('');
  }, [open]); // eslint-disable-line

  const update = (i, patch) =>
    setRoles(r => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const setDefault = (i) =>
    setRoles(r => r.map((x, j) => ({ ...x, is_default: j === i })));

  const addRole = () =>
    setRoles(r => [
      ...r,
      { name: '', description: '', pages: ['/', '/profile'], is_default: r.length === 0 },
    ]);

  const removeRole = (i) => {
    const role = roles[i];
    const inUse = roleCounts[role.name] || 0;
    if (inUse > 0 && !window.confirm(
      `${inUse} ${inUse === 1 ? 'person has' : 'people have'} the "${role.name}" role. ` +
      `If you remove it they will get the default role's pages until an admin changes their role. Remove anyway?`
    )) return;
    setRoles(r => {
      const next = r.filter((_, j) => j !== i);
      if (next.length && !next.some(x => x.is_default)) next[0].is_default = true;
      return next;
    });
  };

  const togglePage = (i, path) => {
    const has = roles[i].pages.includes(path);
    update(i, {
      pages: has ? roles[i].pages.filter(p => p !== path) : [...roles[i].pages, path],
    });
  };

  const save = async () => {
    const names = roles.map(r => r.name.trim().toLowerCase());
    if (!roles.length) return setError('Add at least one role.');
    if (names.some(n => !n)) return setError('Every role needs a name.');
    if (new Set(names).size !== names.length) return setError('Role names must be unique.');
    if (roles.filter(r => r.is_default).length !== 1) {
      return setError('Choose exactly one default role for new signups.');
    }
    setSaving(true);
    setError('');
    try {
      await saveOrgRoles(orgId, roles);
      onClose(true);
    } catch (e) {
      const msg = String(e.message || e);
      setError(
        /jwt expired/i.test(msg)
          ? 'Your session expired. Refresh the page (or log in again) and try once more.'
          : msg
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose(false)} maxWidth="md" fullWidth>
      <DialogTitle>Roles for {orgName}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose which pages each role can open. New signups start with the role marked
          as default, so make that your lowest-access role.
        </Typography>

        {roles.map((role, i) => (
          <Box
            key={i}
            sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, mb: 2 }}
          >
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                label="Role name"
                size="small"
                value={role.name}
                disabled={role._existing}
                helperText={role._existing ? 'Name is locked (users have this role)' : ' '}
                onChange={e => update(i, { name: e.target.value })}
              />
              <TextField
                label="Description"
                size="small"
                sx={{ flex: 1, minWidth: 200 }}
                value={role.description}
                helperText=" "
                onChange={e => update(i, { description: e.target.value })}
              />
              <FormControlLabel
                label="Default for new signups"
                control={
                  <Radio
                    size="small"
                    checked={!!role.is_default}
                    onChange={() => setDefault(i)}
                  />
                }
              />
            </Box>

            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Pages this role can access
            </Typography>
            <FormGroup row>
              {ALL_PAGES.map(p => (
                <FormControlLabel
                  key={p.path}
                  label={p.label}
                  control={
                    <Checkbox
                      size="small"
                      checked={role.pages.includes(p.path)}
                      onChange={() => togglePage(i, p.path)}
                    />
                  }
                />
              ))}
            </FormGroup>

            <Button color="error" size="small" onClick={() => removeRole(i)}>
              Remove role
            </Button>
          </Box>
        ))}

        <Button onClick={addRole}>+ Add role</Button>

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save roles'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}