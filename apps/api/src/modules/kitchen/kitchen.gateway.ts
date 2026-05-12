import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'kitchen',
})
export class KitchenGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private logger: Logger = new Logger('KitchenGateway');

  afterInit(server: Server) {
    this.logger.log('Kitchen Websocket Gateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinBranch')
  handleJoinBranch(client: Socket, branchId: string) {
    client.join(`branch_${branchId}`);
    this.logger.log(`Client ${client.id} joined branch room: branch_${branchId}`);
  }

  @SubscribeMessage('leaveBranch')
  handleLeaveBranch(client: Socket, branchId: string) {
    client.leave(`branch_${branchId}`);
    this.logger.log(`Client ${client.id} left branch room: branch_${branchId}`);
  }

  // Method to emit updates to a specific branch
  emitOrderUpdate(branchId: string, order: any) {
    this.server.to(`branch_${branchId}`).emit('orderUpdated', order);
  }

  emitNewOrder(branchId: string, order: any) {
    this.server.to(`branch_${branchId}`).emit('newOrder', order);
  }
}
