import { Router, Request, Response } from "express"
import { ApiResponse, Links } from "../types/api-types"
import db from "../database"

export abstract class BaseResource {
  protected router: Router
  protected resourcePath: string
  protected tableName: string

  constructor(resourcePath: string, tableName: string) {
    this.router = Router()
    this.resourcePath = resourcePath
    this.tableName = tableName
    this.initializeRoutes()
  }
  protected initializeRoutes(): void {
    this.router.get("/", this.list.bind(this))
    this.router.get("/:id", this.get.bind(this))
    this.router.post("/", this.create.bind(this))
  }

  // GET /:resource
  protected async list(req: Request, res: Response): Promise<void> {
    try {
      const resources = await db.all(`SELECT * FROM ${this.tableName}`)
      const response: ApiResponse<any[]> = {
        data: resources,
        links: this.generateCollectionLinks(req),
      }
      res.json(response)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // GET /:resource/:id
  protected async get(req: Request, res: Response): Promise<void> {
    try {
      const resource = await db.get(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [req.params.id]
      )
      if (!resource) {
        const response: ApiResponse<null> = {
          error: "Resource not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }
      const response: ApiResponse<any> = {
        data: resource,
        links: this.generateResourceLinks(req, resource),
      }
      res.json(response)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // POST /:resource
  protected async create(req: Request, res: Response): Promise<void> {
    try {
      await this.validateCreate(req)
      const resource = await this.performCreate(req)
      const response: ApiResponse<any> = {
        data: resource,
        links: this.generateResourceLinks(req, resource),
      }
      res.status(201).json(response)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  protected generateCollectionLinks(req: Request): Links {
    const baseUrl = `${req.protocol}://${req.get("host")}/${this.resourcePath}`
    return {
      self: { href: baseUrl, rel: "self" },
      create: { href: baseUrl, rel: "create", method: "POST" },
    }
  }
  protected handleError(error: any, res: Response): void {
    console.error(error)
    const statusCode = error.statusCode || 500
    const message = error.message || "Internal Server Error"
    const response: ApiResponse<null> = {
      error: message,
      links: {
        self: {
          href: `${res.req.protocol}://${res.req.get("host")}${
            res.req.originalUrl
          }`,
          rel: "self",
        },
      },
    }
    res.status(statusCode).json(response)
  }

  // Required abstract methods for operations common to all resources
  protected abstract validateCreate(req: Request): Promise<void>
  protected abstract performCreate(req: Request): Promise<any>
  protected abstract generateResourceLinks(req: Request, resource: any): Links

  public getRouter(): Router {
    return this.router
  }
}
