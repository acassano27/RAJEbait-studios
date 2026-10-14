from pathlib import Path
import re

root = Path(__file__).parent
files = sorted((root / 'rooms').glob('room-*.js'))
assert files, 'No room add-ons found'
registrations = {}
for path in files:
    text = path.read_text(encoding='utf-8')
    match = re.search(r'window\.RoomAddons\.register\("([A-Z0-9_]+)", \{', text)
    assert match, f'No registration ID in {path}'
    room_id = match.group(1)
    assert room_id not in registrations, f'Duplicate registration: {room_id}'
    expected_id = path.stem.removeprefix('room-').replace('-', '_').upper()
    assert room_id == expected_id, f'{path.name}: expected registration ID {expected_id}, found {room_id}'
    registrations[room_id] = path
    grid_match = re.search(r'grid: \[\n(.*?)\n    \],', text, re.S)
    assert grid_match, f'Missing grid in {path}'
    rows = re.findall(r'^\s*\[(.*?)\],?$', grid_match.group(1), re.M)
    assert len(rows) == 15, f'{room_id}: expected 15 rows, found {len(rows)}'
    widths = [len(re.findall(r'\b\d+\b', row)) for row in rows]
    assert widths == [20] * 15, f'{room_id}: invalid widths {widths}'
assert 'const ROOMS = {' not in (root / 'game.js').read_text(encoding='utf-8')
html = (root / 'index.html').read_text(encoding='utf-8')
script_tags = re.findall(r'<script src="([^"]+)"></script>', html)
room_scripts = [source for source in script_tags if source.startswith('rooms/room-') and source.endswith('.js')]
expected_scripts = {f'rooms/{path.name}' for path in files}
assert len(room_scripts) == len(set(room_scripts)), 'Duplicate room script tag'
assert set(room_scripts) == expected_scripts, (
    f'Room script mismatch: missing {expected_scripts - set(room_scripts)}, '
    f'unexpected {set(room_scripts) - expected_scripts}'
)
assert 'room-registry.js' in script_tags and 'game.js' in script_tags, 'Missing registry or game script'
registry_index = script_tags.index('room-registry.js')
game_index = script_tags.index('game.js')
assert registry_index < game_index, 'Room registry must load before the game'
assert all(registry_index < script_tags.index(source) < game_index for source in room_scripts), (
    'Room add-ons must load after the registry and before the game'
)
print(f'PASS: {len(files)} add-ons, unique IDs, all grids 15x20, scripts wired in dependency order')
