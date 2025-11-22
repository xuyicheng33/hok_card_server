const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const CardDatabase = require('./game/CardDatabase');
const BattleEngine = require('./game/BattleEngine');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

const rooms = new Map();
const clients = new Map();
const playerRooms = new Map();
const battleEngines = new Map(); // 每个房间的战斗引擎
const cardDB = new CardDatabase();

// 🛡️ 安全配置：最大连接数限制
const MAX_CONNECTIONS = 2;  // 最多2个玩家连接（1v1对战）

function generateRoomId() {
  return Math.floor(Math.random() * 9 + 1).toString();
}

function generateClientId() {
  return 'player_' + Math.random().toString(36).substr(2, 9);
}

function sendToClient(clientId, message) {
  const ws = clients.get(clientId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastToRoom(roomId, message, excludeClient = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players.forEach(playerId => {
    if (playerId !== excludeClient) {
      sendToClient(playerId, message);
    }
  });
}

// 初始化游戏状态
function initGameState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  // 创建初始卡牌状态
  const blueCards = [
    { id: 'blue_gongsunli', ...cardDB.getCard('gongsunli_003'), health: 600 },
    { id: 'blue_lan', ...cardDB.getCard('lan_002'), health: 700 }
  ];
  
  const redCards = [
    { id: 'red_duoliya', ...cardDB.getCard('duoliya_001'), health: 900 },
    { id: 'red_lan', ...cardDB.getCard('lan_002'), health: 700 }
  ];
  
  room.gameState = {
    blueCards,
    redCards,
    turn: 0
  };
  
  // 创建战斗引擎
  battleEngines.set(roomId, new BattleEngine(roomId, room.gameState));
  
  console.log('[游戏初始化]', roomId, '战斗引擎创建完成');
}

wss.on('connection', (ws) => {
  // 🛡️ 检查连接数限制
  if (clients.size >= MAX_CONNECTIONS) {
    console.log('[拒绝连接] 已达到最大连接数:', MAX_CONNECTIONS);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: '服务器已满，当前最多支持' + MAX_CONNECTIONS + '个玩家' 
    }));
    ws.close();
    return;
  }
  
  const clientId = generateClientId();
  clients.set(clientId, ws);
  console.log('[连接] 玩家连接:', clientId, '(当前连接数:', clients.size + '/' + MAX_CONNECTIONS + ')');
  
  ws.send(JSON.stringify({ type: 'welcome', player_id: clientId }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('[消息]', clientId, ':', data.type);
      
      if (data.type === 'create_room') {
        const roomId = generateRoomId();
        const room = {
          id: roomId, 
          host: clientId, 
          guest: null,  // 客人ID
          players: [clientId],
          playerNames: { [clientId]: data.player_name || '玩家1' },
          battleMode: data.battle_mode || '2v2', 
          status: 'waiting', 
          createdAt: Date.now()
        };
        rooms.set(roomId, room);
        playerRooms.set(clientId, roomId);
        sendToClient(clientId, { type: 'room_created', room_id: roomId, player_id: clientId, is_host: true });
        console.log('[房间创建]', roomId);
      }
      else if (data.type === 'join_room') {
        const room = rooms.get(data.room_id);
        if (!room) {
          sendToClient(clientId, { type: 'error', message: '房间不存在' });
        } else if (room.players.length >= 2) {
          sendToClient(clientId, { type: 'error', message: '房间已满' });
        } else {
          room.players.push(clientId);
          room.guest = clientId;  // 设置客人ID
          room.playerNames[clientId] = data.player_name || '玩家2';
          playerRooms.set(clientId, data.room_id);
          sendToClient(clientId, { type: 'room_joined', room_id: data.room_id, player_id: clientId, is_host: false });
          sendToClient(room.host, { type: 'opponent_joined', opponent_id: clientId, opponent_name: room.playerNames[clientId] });
          console.log('[加入房间]', clientId, '加入', data.room_id);
          if (room.players.length === 2) {
            setTimeout(() => {
              room.status = 'playing';
              
              // 🎮 初始化游戏状态
              initGameState(data.room_id);
              
              broadcastToRoom(data.room_id, { 
                type: 'game_start', 
                room_id: data.room_id, 
                players: room.players, 
                player_names: room.playerNames, 
                host: room.host 
              });
              console.log('[游戏开始]', data.room_id);
            }, 500);
          }
        }
      }
      else if (data.type === 'game_action') {
        const roomId = playerRooms.get(clientId);
        const engine = battleEngines.get(roomId);
        
        if (!roomId || !engine) {
          console.error('[游戏操作] 房间或引擎不存在');
          return;
        }
        
        console.log('[游戏操作]', roomId, data.action);
        
        let result = null;
        
        // 🎮 服务器端权威计算
        if (data.action === 'attack') {
          result = engine.calculateAttack(
            data.data.attacker_id,
            data.data.target_id
          );
        } else if (data.action === 'skill') {
          result = engine.calculateSkill(
            data.data.caster_id,
            data.data.skill_name,
            data.data.target_ids
          );
        } else if (data.action === 'end_turn') {
          result = {}; // 结束回合不需要计算
        }
        
        if (result !== null) {
          // 广播给双方（包括发起者）
          const room = rooms.get(roomId);
          room.players.forEach(playerId => {
            sendToClient(playerId, {
              type: 'opponent_action',
              action: data.action,
              data: result,
              from: clientId
            });
          });
        }
      }
    } catch (error) {
      console.error('[错误]', error);
    }
  });
  
  ws.on('close', () => {
    console.log('[断开]', clientId);
    const roomId = playerRooms.get(clientId);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        broadcastToRoom(roomId, { type: 'opponent_disconnected' }, clientId);
        room.players = room.players.filter(p => p !== clientId);
        
        // 清理房间
        if (room.players.length === 0) {
          rooms.delete(roomId);
          battleEngines.delete(roomId); // 删除战斗引擎
          console.log('[房间清理]', roomId);
        }
      }
      playerRooms.delete(clientId);
    }
    clients.delete(clientId);
  });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', name: '王者荣耀卡牌游戏服务器', clients: clients.size, rooms: rooms.size, uptime: process.uptime() });
});

server.listen(PORT, () => {
  console.log('=================================');
  console.log('王者荣耀卡牌游戏服务器已启动');
  console.log('监听端口:', PORT);
  console.log('WebSocket: ws://localhost:' + PORT);
  console.log('=================================');
});
