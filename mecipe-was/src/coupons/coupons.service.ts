import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateCouponDataDto, CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { PrismaService } from 'src/global/prisma.service';
import { verifySignedMessage } from 'src/util/sha256';
import { CafeCoupon, CafeCouponHistory, ProxyUserType } from 'prisma/basic';
import { generateQrMatrix } from 'src/util/qrcode';
import e from 'express';

@Injectable()
export class CouponsService {

  constructor(private readonly prisma: PrismaService) { }

  /**
   * 16자리 시리얼 넘버를 생성하는 함수
   * CafeCoupon과 CafeCouponQRCode 모두에서 중복되지 않도록 보장
   */
  private async generateUniqueSerialNumber(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 30; // 더 많은 시도 횟수

    while (attempts < maxAttempts) {
      const serialNumber = Array.from(
        { length: 16 },
        () => characters.charAt(Math.floor(Math.random() * characters.length))
      ).join('');

      // // CafeCoupon에서 중복 확인
      // const existingCoupon = await this.prisma.cafeCoupon.findUnique({
      //   where: { serialNumber },
      //   select: { id: true }
      // });

      // if (existingCoupon) {
      //   attempts++;
      //   continue;
      // }

      // CafeCouponQRCode에서 중복 확인
      const existingQRCode = await this.prisma.cafeCouponQRCode.findUnique({
        where: { serialNumber },
        select: { serialNumber: true }
      });

      if (existingQRCode) {
        attempts++;
        continue;
      }

      // 두 테이블 모두에서 중복되지 않으면 반환
      return serialNumber;
    }

    throw new Error('Failed to generate unique serial number after maximum attempts');
  }

  async createRawCoupon(name: string, content: string, startDay: Date, endDay: Date, groupCode: string, memberId: string, nickname: string, userType: ProxyUserType, eventDescription: string, duplicate: boolean, force: boolean) {

    if (!duplicate) {
      const coupons = await this.findRawByCouponByGroupCodeWithUserId(groupCode, memberId, userType as ProxyUserType);

      if (coupons.length > 0 && !force) {
        throw new ConflictException('Coupon already exists');
      }
    }

    const group = await this.prisma.cafeCouponGroup.findUnique({
      where: {
        code: groupCode
      }
    });

    if (!group) {
      throw new BadRequestException('Invalid groupCode');
    }

    // 강제 생성 시, 체크 건너뛰기
    if (!force) {

      // 비활성화 체크
      if (group.isDisable) {
        throw new BadRequestException('Coupon group is disabled');
      }

      if (!Object.values(ProxyUserType).includes(userType as ProxyUserType)) {
        throw new BadRequestException('Invalid userType');
      }

      const today = new Date();
      // 발급 시작일 체크
      if (group.issuanceStartDay > today) {
        throw new BadRequestException('Issuance start day is not started');
      }

      // 발급 종료일 체크
      if (group.issuanceEndDay < today) {
        throw new BadRequestException('Issuance end day is expired');
      }

      // 쿠폰 시작일 체크
      if (group.startDay > today) {
        throw new BadRequestException('Coupon start day is not started');
      }
      // 쿠폰 종료일 체크
      if (group.endDay < today) {
        throw new BadRequestException('Coupon end day is expired');
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        let user = await tx.proxyUser.findUnique({
          where: {
            proxyUserUnique: {
              memberId: memberId,
              proxyUserType: userType as ProxyUserType
            }
          }
        });

        if (!user) {
          // 존재하지 않으면 생성
          user = await tx.proxyUser.create({
            data: {
              name: nickname,
              token: memberId,
              memberId,
              proxyUserType: userType as ProxyUserType
            }
          });
        }

        if (!user) {
          throw new BadRequestException('User not found & Created');
        }

        // 16자리 시리얼 넘버 생성 (CafeCoupon과 CafeCouponQRCode 모두에서 중복되지 않음)
        const serialNumber = await this.generateUniqueSerialNumber();

        const coupon = await tx.cafeCoupon.create({
          data: {
            name: name ?? group.name,
            content: content ?? group.description,
            serialNumber,
            startDay: startDay ?? new Date(),
            endDay: endDay ?? group.endDay,
            ProxyUser: {
              connect: {
                id: user.id
              }
            },
            CafeCouponGroup: {
              connect: {
                id: group.id
              }
            }
          },
          include: {
            CafeCouponGroup: {
              select: {
                code: true,
              }
            }
          }
        });

        // 관리자 Actor
        const actor = await tx.user.findFirst({
          where: {
            userType: 'ADMIN'
          }
        });

        if (!actor) {
          throw new BadRequestException('Admin not found');
        }

        // 쿠폰 히스토리 작성
        const couponHistory = await tx.cafeCouponHistory.create({
          data: {
            CafeCoupon: {
              connect: {
                id: coupon.id
              }
            },
            eventType: 'CREATED',
            description: eventDescription ?? '쿠폰 생성',
            Actor: {
              connect: {
                id: actor.id
              }
            },
            statusBefore: null,
            statusAfter: 'ACTIVE'
          }
        });

        return coupon;
      })
    } catch (error) {
      throw error;
    }
  }

  async createCoupon(payload: string, signature: string) {

    // 접근 인증 우선
    if (!verifySignedMessage({ payload: payload, signature: signature }, process.env.COUPON_SECRET)) {
      throw new UnauthorizedException('Invalid signature');
    }

    const { name, content, startDay, endDay, groupCode, memberId, nickname, userType, eventDescription, duplicate, force } = JSON.parse(payload);

    if (!groupCode || !memberId || !nickname || !userType) {
      throw new BadRequestException('Invalid payload');
    }

    try {
      const coupon = await this.createRawCoupon(name ?? null, content ?? null, startDay, endDay ?? null, groupCode, memberId, nickname, userType as ProxyUserType, eventDescription ?? null, duplicate ?? null, force ?? false);
      return coupon;
    } catch (error) {
      throw error;
    }
  }

  async createCouponQRCode(payload: string, signature: string) {
    // 접근 인증 우선
    if (!verifySignedMessage({ payload: payload, signature: signature }, process.env.COUPON_SECRET)) {
      throw new UnauthorizedException('Invalid signature');
    }

    const { serialNumber } = JSON.parse(payload);

    if (!serialNumber) {
      throw new BadRequestException('Invalid payload');
    }

    const coupon = await this.prisma.cafeCoupon.findUnique({
      where: {
        serialNumber: serialNumber
      }
    });

    if (!coupon) {
      throw new BadRequestException('Invalid serialNumber');
    }

    if (coupon.isDisable) {
      throw new BadRequestException('Coupon is disabled');
    }

    // 기존 쿠폰 QR코드 체크
    const existingQRCode = await this.prisma.cafeCouponQRCode.findUnique({
      where: {
        serialNumber: coupon.serialNumber
      },
      include: {
        CafeCoupon: {
          select: {
            serialNumber: true,
            name: true,
            content: true,
            startDay: true,
            endDay: true,
            CafeCouponGroup: {
              select: {
                code: true,
                issuanceEndDay: true,
                issuanceStartDay: true,
              }
            }
          }
        }
      }
    });

    if (existingQRCode) {
      return existingQRCode;
    }

    const { size, base64Data } = await generateQrMatrix(coupon.serialNumber);

    const qrCode = await this.prisma.cafeCouponQRCode.create({
      data: {
        serialNumber: coupon.serialNumber,
        size,
        base64Data,
        CafeCoupon: {
          connect: {
            id: coupon.id
          }
        },
      },
      include: {
        CafeCoupon: {
          select: {
            serialNumber: true,
            name: true,
            content: true,
            startDay: true,
            endDay: true,
            CafeCouponGroup: {
              select: {
                code: true,
                issuanceEndDay: true,
                issuanceStartDay: true,
              }
            }
          }
        }
      }
    });

    return qrCode;
  }

  findCoupon(id: number) {
    return this.prisma.cafeCoupon.findUnique({
      where: {
        id: id
      }
    })
  }

  findRawByCouponByGroupCodeWithUserId(couponGroupCode: string, memberId: string, userType: ProxyUserType) {
    return this.prisma.cafeCoupon.findMany({
      where: {
        ProxyUser: {
          memberId,
          proxyUserType: userType as ProxyUserType
        },
        CafeCouponGroup: {
          code: couponGroupCode
        }
      },
      include: {
        CafeCouponGroup: {
          select: {
            code: true,
          }
        }
      }
    })
  }

  findByCouponByGroupCodeWithUserId(payload: string, signature: string) {

    if (!verifySignedMessage({ payload, signature }, process.env.COUPON_SECRET)) {
      throw new UnauthorizedException('Invalid signature');
    }

    const { groupCode, memberId, userType } = JSON.parse(payload);

    if (!groupCode || !memberId || !userType) {
      throw new BadRequestException('Invalid payload');
    }

    if (!Object.values(ProxyUserType).includes(userType as ProxyUserType)) {
      throw new BadRequestException('Invalid userType');
    }

    return this.findRawByCouponByGroupCodeWithUserId(groupCode, memberId, userType as ProxyUserType);
  }

  async useCoupon(payload: string, signature: string): Promise<CafeCouponHistory & { CafeCoupon: CafeCoupon }> {
    if (!verifySignedMessage({ payload, signature }, process.env.COUPON_SECRET)) {
      throw new UnauthorizedException('Invalid signature');
    }

    const { serialNumber, eventDescription, actorId } = JSON.parse(payload);

    if (!serialNumber) {
      throw new BadRequestException('Invalid payload');
    }

    const coupon = await this.prisma.cafeCoupon.findUnique({
      where: {
        serialNumber: serialNumber
      }
    });

    if (!coupon) {
      throw new BadRequestException('Invalid serialNumber');
    }

    const beforeStatusCouponHistory = await this.prisma.cafeCouponHistory.findFirst({
      where: {
        CafeCoupon: { id: coupon.id },
        eventType: 'CREATED'
      }
    });

    if (!beforeStatusCouponHistory) {
      throw new BadRequestException('Coupon history not found');
    }

    if (coupon.endDay < new Date()) {

      const actor = await this.prisma.user.findFirst({
        where: {
          userType: 'ADMIN'
        }
      });

      if (!actor) {
        throw new BadRequestException('Admin not found');
      }

      await this.prisma.cafeCoupon.update({
        where: { id: coupon.id },
        data: { isDisable: true }
      });

      await this.prisma.cafeCouponHistory.create({
        data: {
          CafeCoupon: {
            connect: { id: coupon.id }
          },
          eventType: 'EXPIRED',
          description: '쿠폰 만료',
          Actor: {
            connect: { id: actor.id }
          },
          statusBefore: beforeStatusCouponHistory.statusAfter,
          statusAfter: 'EXPIRED'
        },
      });

      await this.prisma.cafeCouponQRCode.update({
        where: { serialNumber: coupon.serialNumber },
        data: { isDisable: true }
      });

      throw new BadRequestException('Coupon expired');
    }

    if (coupon.startDay > new Date()) {
      throw new BadRequestException('Coupon not started');
    }

    if (coupon.isDisable) {
      throw new BadRequestException('Coupon disabled');
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId }
    });

    if (!actor) {
      throw new BadRequestException('Actor not found');
    }

    const updatedCoupon = await this.prisma.cafeCoupon.update({
      where: { id: coupon.id },
      data: { isDisable: true }
    });
    // 쿠폰 히스토리 생성
    const couponHistory = await this.prisma.cafeCouponHistory.create({
      data: {
        CafeCoupon: {
          connect: { id: coupon.id }
        },
        eventType: 'USED',
        description: eventDescription ?? '쿠폰 사용',
        Actor: {
          connect: { id: actor.id }
        },
        statusBefore: beforeStatusCouponHistory.statusAfter,
        statusAfter: 'USED'
      }
    });

    await this.prisma.cafeCouponQRCode.update({
      where: { serialNumber: coupon.serialNumber },
      data: { isDisable: true }
    });

    return {
      ...couponHistory,
      CafeCoupon: updatedCoupon
    }
  }

  async testQr(text: string) {
    const { size, base64Data } = await generateQrMatrix(text);

    return {
      size,
      base64Data
    }
  }

}


